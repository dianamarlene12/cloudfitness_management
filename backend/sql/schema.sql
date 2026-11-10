-- =============================================================================
-- FitTrack — Cloud-Based Fitness & Gym Management Database Schema
-- Database: fittrack_db
-- =============================================================================

CREATE DATABASE IF NOT EXISTS `fittrack_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

USE `fittrack_db`;

-- Drop tables in reverse dependency order if recreating
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `trainer_schedules`;
DROP TABLE IF EXISTS `workout_logs`;
DROP TABLE IF EXISTS `workout_plans`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `member_memberships`;
DROP TABLE IF EXISTS `memberships`;
DROP TABLE IF EXISTS `trainers`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `users`;

-- 1. Users Table (Core Auth & RBAC)
CREATE TABLE `users` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'trainer', 'member') NOT NULL DEFAULT 'member',
  `status` ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Members Table (Extended profile for users with role 'member')
CREATE TABLE `members` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `phone` VARCHAR(30) DEFAULT NULL,
  `date_of_birth` DATE DEFAULT NULL,
  `emergency_contact` VARCHAR(120) DEFAULT NULL,
  `rfid_tag` VARCHAR(64) NOT NULL UNIQUE,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_members_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Trainers Table (Extended profile for users with role 'trainer')
CREATE TABLE `trainers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `specialization` VARCHAR(120) NOT NULL,
  `bio` TEXT DEFAULT NULL,
  `availability` VARCHAR(255) DEFAULT 'Mon-Fri 06:00 - 20:00',
  `hourly_rate` DECIMAL(10, 2) NOT NULL DEFAULT 65.00,
  `rating` DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
  `max_clients` INT UNSIGNED NOT NULL DEFAULT 35,
  `image_url` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_trainers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Memberships Table (Membership plans and pricing tiers)
CREATE TABLE `memberships` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL,
  `tier_code` VARCHAR(40) NOT NULL UNIQUE,
  `duration_months` INT UNSIGNED NOT NULL DEFAULT 1,
  `price` DECIMAL(10, 2) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `features` JSON DEFAULT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Member Memberships Table (Active/Past subscriptions)
CREATE TABLE `member_memberships` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `member_id` INT UNSIGNED NOT NULL,
  `membership_id` INT UNSIGNED NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `auto_renew` BOOLEAN NOT NULL DEFAULT TRUE,
  `status` ENUM('active', 'expired', 'pending', 'cancelled') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_member_membership_dates` (`start_date`, `end_date`),
  INDEX `idx_member_membership_status` (`status`),
  CONSTRAINT `fk_mm_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mm_membership` FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Attendance Table (Automated Turnstile access records)
CREATE TABLE `attendance` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `member_id` INT UNSIGNED NOT NULL,
  `check_in_time` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `check_out_time` TIMESTAMP NULL DEFAULT NULL,
  `access_method` ENUM('rfid', 'qr', 'manual', 'kiosk') NOT NULL DEFAULT 'rfid',
  `status` ENUM('checked_in', 'checked_out') NOT NULL DEFAULT 'checked_in',
  `turnstile_id` VARCHAR(50) DEFAULT 'Gate-Bay-01',
  `notes` VARCHAR(255) DEFAULT NULL,
  INDEX `idx_attendance_member` (`member_id`),
  INDEX `idx_attendance_checkin` (`check_in_time`),
  INDEX `idx_attendance_status` (`status`),
  CONSTRAINT `fk_attendance_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Workout Plans Table
CREATE TABLE `workout_plans` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `member_id` INT UNSIGNED NOT NULL,
  `trainer_id` INT UNSIGNED DEFAULT NULL,
  `plan_name` VARCHAR(120) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `target_goal` VARCHAR(120) DEFAULT NULL,
  `status` ENUM('active', 'completed', 'paused') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_workout_plans_member` (`member_id`),
  INDEX `idx_workout_plans_trainer` (`trainer_id`),
  CONSTRAINT `fk_wp_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wp_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Workout Logs Table (Completed sets/reps/weights)
CREATE TABLE `workout_logs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `workout_plan_id` INT UNSIGNED DEFAULT NULL,
  `member_id` INT UNSIGNED NOT NULL,
  `exercise_name` VARCHAR(120) NOT NULL,
  `sets` INT UNSIGNED NOT NULL DEFAULT 3,
  `reps` INT UNSIGNED NOT NULL DEFAULT 10,
  `weight_kg` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `completed_date` DATE NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_wl_member` (`member_id`),
  INDEX `idx_wl_date` (`completed_date`),
  CONSTRAINT `fk_wl_plan` FOREIGN KEY (`workout_plan_id`) REFERENCES `workout_plans` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wl_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Trainer Schedules Table (Availability & booked sessions)
CREATE TABLE `trainer_schedules` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `trainer_id` INT UNSIGNED NOT NULL,
  `member_id` INT UNSIGNED DEFAULT NULL,
  `title` VARCHAR(120) NOT NULL DEFAULT 'Personal Training Session',
  `session_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `status` ENUM('available', 'booked', 'completed', 'cancelled') NOT NULL DEFAULT 'available',
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_schedules_trainer_date` (`trainer_id`, `session_date`),
  INDEX `idx_schedules_member` (`member_id`),
  CONSTRAINT `fk_ts_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `trainers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ts_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Payments Table (Simulated ledger transactions)
CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `member_id` INT UNSIGNED NOT NULL,
  `membership_id` INT UNSIGNED DEFAULT NULL,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'UPI / POS Terminal',
  `status` ENUM('paid', 'pending', 'failed') NOT NULL DEFAULT 'paid',
  `transaction_ref` VARCHAR(100) NOT NULL UNIQUE,
  `payment_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` VARCHAR(255) DEFAULT 'Simulated automated payment processing',
  INDEX `idx_payments_member` (`member_id`),
  INDEX `idx_payments_status` (`status`),
  INDEX `idx_payments_date` (`payment_date`),
  CONSTRAINT `fk_pay_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_membership` FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Notifications Table
CREATE TABLE `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'warning', 'success', 'alert') NOT NULL DEFAULT 'info',
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_notif_user` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
