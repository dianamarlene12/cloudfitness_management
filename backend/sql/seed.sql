-- =============================================================================
-- FitTrack — Seed Data
-- Database: fittrack_db
-- Note: Passwords for seeded trainer/member demo accounts are hashed with bcrypt:
-- 'TrainerPass123!' -> $2a$10$wNqV6ZcW7iM3Gv7Gfx17/e98tYwzP5yv.0E1V6Jj23r/1CkWzP89m
-- 'MemberPass123!'  -> $2a$10$Yd3xR9aK1vN7uB7Hfy28/e87tXxyP4xv.1D0U5Ii12q/0BjVyO78l
-- Initial admin account is created via 'npm run init-admin' to prevent public default admin credentials.
-- =============================================================================

USE `fittrack_db`;

-- 1. Insert Membership Plans
INSERT INTO `memberships` (`id`, `name`, `tier_code`, `duration_months`, `price`, `description`, `features`, `is_active`) VALUES
(1, 'Basic Access', 'basic', 1, 2499.00, 'Standard gym access during regular operating hours.', 
 '["Access to strength floor & cardio equipment", "Standard locker room access", "Self-service mobile kiosk check-in"]', TRUE),
(2, 'Pro Athlete', 'pro', 1, 4999.00, 'All-access tier for dedicated athletes with biometric telemetry.', 
 '["24/7 RFID turnstile high-speed entry", "All Olympic lifting & functional bays", "1 Monthly Coach Form Review", "Locker & recovery lounge pass"]', TRUE),
(3, 'Elite Performance', 'elite', 1, 9999.00, 'Unlimited premium access with dedicated 1-on-1 coaching & recovery.', 
 '["Unlimited 24/7 VIP priority turnstile", "Dedicated coach assigned", "Weekly VO2 & body composition telemetry", "Infrared sauna & cold plunge access", "Complimentary guest passes"]', TRUE);

-- 2. Insert Users (Trainers)
-- Password for all seeded trainers: 'TrainerPass123!'
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`) VALUES
(2, 'Elena Rostova', 'elena.rostova@nexusfit.com', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'trainer', 'active'),
(3, 'Marcus Vance', 'marcus.vance@athleticops.com', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'trainer', 'active'),
(4, 'Dr. Derrick Thorne', 'derrick.thorne@rehabops.io', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'trainer', 'active'),
(5, 'Aria Kincaid', 'aria.kincaid@speedgrid.net', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'trainer', 'active');

-- 3. Insert Trainer Profiles
INSERT INTO `trainers` (`id`, `user_id`, `specialization`, `bio`, `availability`, `hourly_rate`, `rating`, `max_clients`, `image_url`) VALUES
(1, 2, 'Functional Hypertrophy', 'Master of periodized hypertrophy, tempo modulation, and corrective mechanics.', 'Mon-Fri 06:00 - 18:00', 1500.00, 5.00, 35, './assets/trainer-elena.png'),
(2, 3, 'Olympic Weightlifting', 'Former national weightlifter focusing on snatch, clean & jerk, and explosive power.', 'Mon-Sat 07:00 - 19:00', 1800.00, 4.90, 30, './assets/trainer-marcus.png'),
(3, 4, 'Kinetic Recovery & PT', 'Doctor of Physical Therapy specializing in kinetic chain restoration and injury prevention.', 'Tue-Sat 08:00 - 17:00', 2200.00, 4.90, 25, './assets/trainer-derrick.png'),
(4, 5, 'HIIT & VO2 Conditioning', 'Specialist in metabolic threshold training, hybrid sprints, and anaerobic stamina.', 'Mon-Fri 06:00 - 16:00', 1400.00, 4.90, 32, './assets/trainer-aria.png');

-- 4. Insert Users (Members)
-- Password for all seeded members: 'MemberPass123!'
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `status`) VALUES
(6, 'Marcus Brody', 'm.brody@apexathletics.io', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'member', 'active'),
(7, 'Kaelen Diaz', 'kaelen.diaz@apexspeed.io', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'member', 'active'),
(8, 'Zara Lindqvist', 'zara.lind@nordicfit.com', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'member', 'active'),
(9, 'Chloe St. Pierre', 'c.stpierre@designgrid.ca', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'member', 'active'),
(10, 'Liam Vance', 'liam.vance@vancamedia.co', '$2a$10$tZ2R8vjH9mP8kL7QyX1/AeF7s8k8u9w6m5Q7l8A9k0B1c2D3e4F5.', 'member', 'active');

-- 5. Insert Member Profiles
INSERT INTO `members` (`id`, `user_id`, `phone`, `date_of_birth`, `emergency_contact`, `rfid_tag`, `notes`) VALUES
(1, 6, '+1 (555) 234-5678', '1994-06-12', 'Sarah Brody: +1 (555) 998-1234', '#FT-8841', 'Advanced powerlifter. Prefers Bay 3.'),
(2, 7, '+1 (555) 876-5432', '1998-09-24', 'Carlos Diaz: +1 (555) 776-4321', '#FT-8842', 'Sprint training athlete. Regular 07:00 slot.'),
(3, 8, '+1 (555) 345-6789', '1992-03-15', 'Olaf Lindqvist: +1 (555) 887-2233', '#FT-8843', 'Marathon conditioning. Core recovery focus.'),
(4, 9, '+1 (555) 456-7890', '1996-11-04', 'Jean St. Pierre: +1 (555) 332-1144', '#FT-8844', 'Functional strength training.'),
(5, 10, '+1 (555) 567-8901', '1991-08-19', 'Rachel Vance: +1 (555) 665-9988', '#FT-8845', 'Hypertrophy program.');

-- 6. Insert Member Memberships (Subscriptions)
INSERT INTO `member_memberships` (`id`, `member_id`, `membership_id`, `start_date`, `end_date`, `auto_renew`, `status`) VALUES
(1, 1, 3, DATE_SUB(CURDATE(), INTERVAL 15 DAY), DATE_ADD(CURDATE(), INTERVAL 75 DAY), TRUE, 'active'),
(2, 2, 2, DATE_SUB(CURDATE(), INTERVAL 20 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), TRUE, 'active'),
(3, 3, 2, DATE_SUB(CURDATE(), INTERVAL 60 DAY), DATE_ADD(CURDATE(), INTERVAL 30 DAY), FALSE, 'active'),
(4, 4, 1, DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 25 DAY), TRUE, 'active'),
(5, 5, 2, DATE_SUB(CURDATE(), INTERVAL 35 DAY), DATE_SUB(CURDATE(), INTERVAL 5 DAY), FALSE, 'expired');

-- 7. Insert Attendance (Turnstile Logs)
INSERT INTO `attendance` (`id`, `member_id`, `check_in_time`, `check_out_time`, `access_method`, `status`, `turnstile_id`, `notes`) VALUES
(1, 1, NOW() - INTERVAL 45 MINUTE, NULL, 'rfid', 'checked_in', 'Gate-Bay-01', 'VIP biometric scan verified'),
(2, 2, NOW() - INTERVAL 120 MINUTE, NOW() - INTERVAL 30 MINUTE, 'rfid', 'checked_out', 'Gate-Bay-02', 'Completed 90-min session'),
(3, 3, NOW() - INTERVAL 20 MINUTE, NULL, 'rfid', 'checked_in', 'Gate-Bay-01', 'RFID scan clearance'),
(4, 4, NOW() - INTERVAL 3 HOUR, NOW() - INTERVAL 1 HOUR, 'kiosk', 'checked_out', 'Gate-Bay-03', 'Card scan checkout');

-- 8. Insert Workout Plans
INSERT INTO `workout_plans` (`id`, `member_id`, `trainer_id`, `plan_name`, `description`, `target_goal`, `status`) VALUES
(1, 1, 2, 'Olympic Heavy Pulls & Squat Cycle', 'Focus on bar speed, clean pulls, and front squat overload.', 'Increase clean 1RM by 10kg', 'active'),
(2, 2, 4, 'VO2 Max Threshold & Sprint Shuttles', 'High-intensity interval conditioning with lactate recovery.', 'Improve VO2 Max score', 'active'),
(3, 3, 1, 'Posterior Chain Hypertrophy', 'Deadlift variations, hip thrusts, and hamstring eccentric overload.', 'Glute and hamstring development', 'active');

-- 9. Insert Workout Logs
INSERT INTO `workout_logs` (`id`, `workout_plan_id`, `member_id`, `exercise_name`, `sets`, `reps`, `weight_kg`, `completed_date`, `notes`) VALUES
(1, 1, 1, 'Barbell Front Squats', 5, 5, 120.00, CURDATE(), 'Clean depth achieved with 2s pause.'),
(2, 1, 1, 'Snatch High Pulls', 4, 3, 95.00, CURDATE(), 'Explosive triple extension.'),
(3, 2, 2, 'Assault Bike Interval Sprints', 8, 1, 0.00, CURDATE(), '30s max effort / 60s recovery.'),
(4, 3, 3, 'Romanian Deadlifts', 4, 8, 80.00, CURDATE(), 'Controlled 3-second descent.');

-- 10. Insert Trainer Schedules
INSERT INTO `trainer_schedules` (`id`, `trainer_id`, `member_id`, `title`, `session_date`, `start_time`, `end_time`, `status`, `notes`) VALUES
(1, 2, 1, 'Olympic Lifting Form Audit', CURDATE(), '10:00:00', '11:00:00', 'booked', 'Focus on bar path'),
(2, 4, 2, 'VO2 Track Shuttles', CURDATE(), '14:00:00', '15:00:00', 'booked', 'Track conditioning bay'),
(3, 1, NULL, 'Open Coaching Slot', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '09:00:00', '10:00:00', 'available', 'Free booking slot'),
(4, 3, NULL, 'Physical Therapy Assessment', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '11:00:00', '12:00:00', 'available', 'Rehab clinic bay');

-- 11. Insert Simulated Payments
INSERT INTO `payments` (`id`, `member_id`, `membership_id`, `invoice_number`, `amount`, `currency`, `payment_method`, `status`, `transaction_ref`, `payment_date`, `notes`) VALUES
(1, 1, 3, 'INV-8493', 9999.00, 'INR', 'UPI / QR POS Terminal', 'paid', 'TX-SIM-9981-A', NOW() - INTERVAL 1 DAY, 'Simulated monthly Elite tier settlement'),
(2, 2, 2, 'INV-8492', 4999.00, 'INR', 'Direct Debit / NetBanking', 'paid', 'TX-SIM-9982-B', NOW() - INTERVAL 2 DAY, 'Simulated recurring subscription'),
(3, 3, 2, 'INV-8491', 4999.00, 'INR', 'Front Desk Terminal / Cash', 'paid', 'TX-SIM-9983-C', NOW() - INTERVAL 3 DAY, 'Front desk point-of-sale receipt'),
(4, 4, 1, 'INV-8490', 2499.00, 'INR', 'UPI / GPay POS', 'paid', 'TX-SIM-9984-D', NOW() - INTERVAL 4 DAY, 'Contactless smartphone terminal checkout');

-- 12. Insert Notifications
INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `is_read`, `created_at`) VALUES
(1, 6, 'Turnstile Check-In Confirmed', 'RFID Badge #FT-8841 verified at Gate-Bay-01.', 'success', FALSE, NOW() - INTERVAL 45 MINUTE),
(2, 7, 'Scheduled Coaching Session', 'Your session with Aria Kincaid is confirmed for today at 14:00.', 'info', FALSE, NOW() - INTERVAL 3 HOUR),
(3, 10, 'Subscription Expired', 'Your Pro Athlete subscription has expired. Please renew at the kiosk or terminal.', 'warning', FALSE, NOW() - INTERVAL 1 DAY);
