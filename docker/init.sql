CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_name VARCHAR(255) NOT NULL,
  user_id INT NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'PENDING',
  risk_score INT,
  risk_level VARCHAR(50),
  result_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_analyses_user_id (user_id),
  INDEX idx_analyses_repo_name (repo_name)
);

CREATE TABLE IF NOT EXISTS scheduled_repos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL DEFAULT 0,
  repo_name VARCHAR(255) NOT NULL,
  cron_pattern VARCHAR(100) NOT NULL DEFAULT '0 0 * * *',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_repo (user_id, repo_name)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified TINYINT(1) DEFAULT 0,
  verification_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alert_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  repo_name VARCHAR(255) NOT NULL,
  threshold INT NOT NULL DEFAULT 60,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_repo (user_id, repo_name),
  INDEX idx_alert_sub_repo (repo_name),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
