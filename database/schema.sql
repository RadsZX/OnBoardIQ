CREATE DATABASE IF NOT EXISTS onboardiq;
USE onboardiq;

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(32) NOT NULL,
  customer_id VARCHAR(32) NOT NULL,
  age INT NOT NULL,
  age_group VARCHAR(16) NOT NULL,
  gender VARCHAR(24) NOT NULL,
  city VARCHAR(64) NOT NULL,
  loan_type VARCHAR(64) NOT NULL,
  device_type VARCHAR(32) NOT NULL,
  browser VARCHAR(64) NOT NULL,
  network_speed VARCHAR(32) NOT NULL,
  income_range VARCHAR(32) NOT NULL,
  employment_status VARCHAR(64) NOT NULL,
  credit_score INT NOT NULL,
  step_name VARCHAR(64) NOT NULL,
  timestamp DATETIME NOT NULL,
  date DATE NOT NULL,
  time_spent_seconds INT NOT NULL,
  error_code VARCHAR(64) NOT NULL,
  completed_step BOOLEAN NOT NULL,
  final_status VARCHAR(32) NOT NULL,
  exit_step VARCHAR(64) NOT NULL,
  otp_attempts INT NOT NULL,
  INDEX idx_session (session_id),
  INDEX idx_customer (customer_id),
  INDEX idx_filters (date, loan_type, city, device_type, age_group)
);
