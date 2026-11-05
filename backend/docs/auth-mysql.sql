-- 餐小助用户认证与注册模块 MySQL 建表脚本
-- 适用场景：后续从当前 SQLite 开发库迁移到 MySQL 生产库。

CREATE TABLE IF NOT EXISTS merchant_users (
  id VARCHAR(64) PRIMARY KEY,
  account VARCHAR(32) NOT NULL,
  email VARCHAR(120) NULL,
  phone VARCHAR(20) NULL,
  display_name VARCHAR(64) NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT '老板',
  phone_mask VARCHAR(24) NULL,
  password_hash VARCHAR(256) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  assigned_shop_ids JSON NOT NULL,
  default_shop_id INT NOT NULL,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_merchant_users_account (account),
  UNIQUE KEY uk_merchant_users_email (email),
  UNIQUE KEY uk_merchant_users_phone (phone),
  KEY idx_merchant_users_status (status),
  KEY idx_merchant_users_default_shop_id (default_shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_sessions (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(128) NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_auth_sessions_token_hash (token_hash),
  KEY idx_auth_sessions_user_id (user_id),
  KEY idx_auth_sessions_expires_at (expires_at),
  CONSTRAINT fk_auth_sessions_user
    FOREIGN KEY (user_id) REFERENCES merchant_users(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  account VARCHAR(120) NOT NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  success TINYINT(1) NOT NULL,
  reason VARCHAR(128) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_login_audit_logs_user_id (user_id),
  KEY idx_login_audit_logs_account (account),
  KEY idx_login_audit_logs_created_at (created_at),
  CONSTRAINT fk_login_audit_logs_user
    FOREIGN KEY (user_id) REFERENCES merchant_users(id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
