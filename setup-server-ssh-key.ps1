param(
  [string]$Server = "203.0.113.10",
  [string]$User = "ubuntu",
  [string]$KeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command not found: $Name. Please enable Windows OpenSSH Client first."
  }
}

Require-Command "ssh.exe"
Require-Command "ssh-keygen.exe"

$SshDir = Split-Path -Parent $KeyPath
if (-not (Test-Path -LiteralPath $SshDir)) {
  New-Item -ItemType Directory -Path $SshDir | Out-Null
}

if (-not (Test-Path -LiteralPath $KeyPath)) {
  Write-Host "Generating SSH key: $KeyPath"
  ssh-keygen.exe -t ed25519 -f $KeyPath -N "" -C "canteen-helper-deploy" | Out-Host
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to generate SSH key."
  }
} else {
  Write-Host "SSH key already exists: $KeyPath"
}

$PublicKeyPath = "$KeyPath.pub"
if (-not (Test-Path -LiteralPath $PublicKeyPath)) {
  throw "Public key not found: $PublicKeyPath"
}

$PublicKey = (Get-Content -Raw -Encoding ASCII $PublicKeyPath).Trim()
$EncodedPublicKey = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($PublicKey))

$RemoteScript = @'
set -e
mkdir -p ~/.ssh
chmod 700 ~/.ssh
PUB_KEY="$(printf '%s' "__PUB_KEY_B64__" | base64 -d)"
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
if ! grep -qxF "$PUB_KEY" ~/.ssh/authorized_keys; then
  printf '%s\n' "$PUB_KEY" >> ~/.ssh/authorized_keys
fi
echo "SSH key installed."
'@

$RemoteScript = $RemoteScript.Replace("__PUB_KEY_B64__", $EncodedPublicKey)

Write-Host "Installing public key to ${User}@${Server}. You only need to enter the server password this time."
$RemoteScript | ssh.exe "${User}@${Server}" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to install SSH key."
}

Write-Host "Testing key login..."
ssh.exe -i $KeyPath -o BatchMode=yes "${User}@${Server}" "echo SSH key login OK"
if ($LASTEXITCODE -ne 0) {
  throw "SSH key login test failed."
}

Write-Host ""
Write-Host "Completed. Future commands can use:"
Write-Host "powershell -ExecutionPolicy Bypass -File .\quick-update-all.ps1 -User $User -Server $Server"
