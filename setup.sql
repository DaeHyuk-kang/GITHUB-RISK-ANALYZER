-- 1. Create the database
CREATE DATABASE IF NOT EXISTS github_risk_analyzer;

-- 2. Create a new user and grant privileges
-- Replace 'GRA-db' and 'kang0430!' with your preferred username and password
CREATE USER IF NOT EXISTS 'GRA-db'@'localhost' IDENTIFIED BY 'kang0430!';
GRANT ALL PRIVILEGES ON github_risk_analyzer.* TO 'GRA-db'@'localhost';
FLUSH PRIVILEGES;

-- 3. Use the database and create the table
USE github_risk_analyzer;

CREATE TABLE IF NOT EXISTS analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  risk_score INT,
  risk_level VARCHAR(50),
  result_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scheduled_repos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  repo_name VARCHAR(255) NOT NULL UNIQUE,
  cron_pattern VARCHAR(100) NOT NULL DEFAULT '0 0 * * *',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
