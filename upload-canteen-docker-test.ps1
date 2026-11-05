param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$RemoteDir = "/opt/projects/canteen-helper-docker-test"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Please enable Windows OpenSSH Client first."
  }
}

function Invoke-RobocopyChecked {
  param(
    [string]$Source,
    [string]$Destination
  )

  robocopy $Source $Destination /E /XD node_modules dist .git .vite .tmp /XF .env dev.db *.log | Out-Host
  if ($LASTEXITCODE -ge 8) {
    throw "Robocopy failed: $Source -> $Destination. Exit code: $LASTEXITCODE"
  }
}

Require-Command "scp.exe"
Require-Command "ssh.exe"
Require-Command "tar.exe"

$Workspace = Split-Path -Parent $MyInvocation.MyCommand.Path
$StagingRoot = Join-Path $env:TEMP "canteen-helper-docker-test-upload"
$Staging = Join-Path $StagingRoot "canteen-helper-docker-test"
$ArchivePath = Join-Path $StagingRoot "canteen-helper-docker-test.tgz"

if (Test-Path $StagingRoot) {
  $Resolved = (Resolve-Path $StagingRoot).Path
  if (-not $Resolved.StartsWith($env:TEMP, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe staging path: $Resolved"
  }
  Remove-Item -LiteralPath $StagingRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $Staging | Out-Null

Write-Host "Preparing Docker test deployment package..."
Invoke-RobocopyChecked -Source (Join-Path $Workspace "backend") -Destination (Join-Path $Staging "backend")
Invoke-RobocopyChecked -Source (Join-Path $Workspace "front-pc") -Destination (Join-Path $Staging "front-pc")
Invoke-RobocopyChecked -Source (Join-Path $Workspace "front-phone") -Destination (Join-Path $Staging "front-phone")
Copy-Item -Path (Join-Path $Workspace "deploy") -Destination (Join-Path $Staging "deploy") -Recurse -Force
Copy-Item -Path (Join-Path $Workspace "docker-compose.canteen-test.yml") -Destination $Staging -Force
Copy-Item -Path (Join-Path $Workspace ".dockerignore") -Destination $Staging -Force
Copy-Item -Path (Join-Path $Workspace ".env.docker.example") -Destination $Staging -Force

Write-Host "Packing archive..."
tar.exe -czf $ArchivePath -C $StagingRoot "canteen-helper-docker-test"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create Docker test archive."
}

Write-Host "Uploading archive to $Server..."
scp.exe $ArchivePath "${User}@${Server}:/tmp/canteen-helper-docker-test.tgz"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed. Please verify SSH login."
}

$RemoteScript = @'
set -e
REMOTE_DIR="__REMOTE_DIR__"
ARCHIVE="/tmp/canteen-helper-docker-test.tgz"
UPLOAD_DIR="/tmp/canteen-helper-docker-test-upload"

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

echo "==> Prepare target directory"
$SUDO mkdir -p "$REMOTE_DIR"
$SUDO chown -R "$(id -un)":"$(id -gn)" "$REMOTE_DIR"

echo "==> Unpack source without deleting runtime env or database volume"
rm -rf "$UPLOAD_DIR"
mkdir -p "$UPLOAD_DIR"
tar -xzf "$ARCHIVE" -C "$UPLOAD_DIR" --strip-components=1

find "$REMOTE_DIR" -mindepth 1 -maxdepth 1 \
  ! -name '.env.docker' \
  ! -name 'runtime' \
  -exec rm -rf {} +
cp -a "$UPLOAD_DIR"/. "$REMOTE_DIR"/

if [ ! -f "$REMOTE_DIR/.env.docker" ]; then
  cp "$REMOTE_DIR/.env.docker.example" "$REMOTE_DIR/.env.docker"
  chmod 600 "$REMOTE_DIR/.env.docker"
  echo "Created $REMOTE_DIR/.env.docker from example. Please fill secrets if needed."
fi

merge_env_if_empty() {
  KEY="$1"
  SOURCE_FILE="$2"
  TARGET_FILE="$3"
  SOURCE_LINE="$(grep -E "^${KEY}=" "$SOURCE_FILE" 2>/dev/null | tail -n 1 || true)"
  [ -n "$SOURCE_LINE" ] || return 0

  SOURCE_VALUE="${SOURCE_LINE#*=}"
  [ -n "$SOURCE_VALUE" ] || return 0

  if grep -qE "^${KEY}=" "$TARGET_FILE"; then
    TARGET_LINE="$(grep -E "^${KEY}=" "$TARGET_FILE" | tail -n 1 || true)"
    TARGET_VALUE="${TARGET_LINE#*=}"
    if [ -z "$TARGET_VALUE" ]; then
      sed -i "s|^${KEY}=.*|${KEY}=${SOURCE_VALUE}|" "$TARGET_FILE"
      echo "Filled ${KEY} from existing backend env"
    fi
  else
    printf '%s=%s\n' "$KEY" "$SOURCE_VALUE" >> "$TARGET_FILE"
    echo "Added ${KEY} from existing backend env"
  fi
}

merge_env_if_placeholder() {
  KEY="$1"
  PLACEHOLDER="$2"
  SOURCE_FILE="$3"
  TARGET_FILE="$4"
  SOURCE_LINE="$(grep -E "^${KEY}=" "$SOURCE_FILE" 2>/dev/null | tail -n 1 || true)"
  [ -n "$SOURCE_LINE" ] || return 0

  SOURCE_VALUE="${SOURCE_LINE#*=}"
  [ -n "$SOURCE_VALUE" ] || return 0

  if grep -qE "^${KEY}=${PLACEHOLDER}$" "$TARGET_FILE"; then
    sed -i "s|^${KEY}=.*|${KEY}=${SOURCE_VALUE}|" "$TARGET_FILE"
    echo "Replaced placeholder ${KEY} from existing backend env"
  fi
}

SOURCE_ENV=""
for CANDIDATE in \
  "/opt/projects/canteen-helper/backend/.env" \
  "/opt/canteen-helper/backend/.env"
do
  if [ -f "$CANDIDATE" ]; then
    SOURCE_ENV="$CANDIDATE"
    break
  fi
done

if [ -n "$SOURCE_ENV" ]; then
  echo "==> Merge missing Docker env values from $SOURCE_ENV"
  for KEY in \
    AI_PROVIDER OPENAI_API_KEY OPENAI_MODEL QWEN_API_KEY QWEN_MODEL QWEN_BASE_URL \
    QWEATHER_API_KEY QWEATHER_API_HOST AMAP_WEB_SERVICE_KEY \
    ALIYUN_ACCESS_KEY_ID ALIYUN_ACCESS_KEY_SECRET ALIYUN_SMS_PROVIDER \
    ALIYUN_SMS_SIGN_NAME ALIYUN_SMS_TEMPLATE_CODE ALIYUN_SMS_REGION \
    ALIYUN_PNVS_SCHEME_CODE ALIYUN_PNVS_TEMPLATE_CODE ALIYUN_PNVS_SIGN_NAME \
    ALIYUN_PNVS_SYSTEM_SIGN_NAME ALIYUN_PNVS_REGION ALIBABA_SMS_SIGN_NAME \
    WECHAT_LOGIN_APP_ID WECHAT_LOGIN_APP_SECRET WECHAT_LOGIN_REDIRECT_URI \
    WECHAT_LOGIN_DEFAULT_SHOP_ID
  do
    merge_env_if_empty "$KEY" "$SOURCE_ENV" "$REMOTE_DIR/.env.docker"
  done

  merge_env_if_placeholder "AI_PROVIDER" "mock" "$SOURCE_ENV" "$REMOTE_DIR/.env.docker"
fi

if grep -q '^AI_PROVIDER=mock$' "$REMOTE_DIR/.env.docker" && grep -qE '^QWEN_API_KEY=.+$' "$REMOTE_DIR/.env.docker"; then
  sed -i 's/^AI_PROVIDER=mock$/AI_PROVIDER=qwen/' "$REMOTE_DIR/.env.docker"
  echo "Switched AI_PROVIDER to qwen because QWEN_API_KEY is configured"
fi

if grep -q '^ALIYUN_SMS_PROVIDER=$' "$REMOTE_DIR/.env.docker"; then
  sed -i 's/^ALIYUN_SMS_PROVIDER=$/ALIYUN_SMS_PROVIDER=pnvs/' "$REMOTE_DIR/.env.docker"
fi

chmod 600 "$REMOTE_DIR/.env.docker"

echo "==> Upload completed"
echo "Project: $REMOTE_DIR"
echo "Next:"
echo "  cd $REMOTE_DIR"
echo "  docker compose -f docker-compose.canteen-test.yml --env-file .env.docker up -d --build"
'@

$RemoteScript = $RemoteScript.Replace("__REMOTE_DIR__", $RemoteDir)

Write-Host "Installing uploaded package on server..."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote installation failed. Please send the last 40 lines of output."
}

Write-Host ""
Write-Host "Docker test package uploaded."
Write-Host "Server path: $RemoteDir"
Write-Host "Guide: $RemoteDir/deploy/docker/README-canteen-docker-test.md"
