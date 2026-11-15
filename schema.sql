-- ============================================================
-- Expense Tracker Database Schema
-- Execute this script in MySQL Workbench or MySQL CLI
-- ============================================================

CREATE DATABASE IF NOT EXISTS `expense_tracker`;
USE `expense_tracker`;

-- 1. Users Table (Stores user credentials with hashed passwords)
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(50) NOT NULL PRIMARY KEY,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Transaction Table (Stores user income and expense records)
CREATE TABLE IF NOT EXISTS `transaction` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `type` ENUM('Income', 'Expense') NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `transaction_date` DATE NOT NULL,
  `user_id` VARCHAR(50) NULL
);
