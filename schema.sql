CREATE DATABASE IF NOT EXISTS university_api;
USE university_api;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  roll_no VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL,
  semester INT NOT NULL
);

CREATE TABLE IF NOT EXISTS teachers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_no VARCHAR(30) NOT NULL UNIQUE,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  department VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS academic_marks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  subject VARCHAR(100) NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL DEFAULT 100,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  api_key VARCHAR(100) NOT NULL UNIQUE,
  user_type ENUM('student','teacher') NOT NULL,
  user_id INT NOT NULL,
  request_limit INT NOT NULL DEFAULT 20,
  requests_used INT NOT NULL DEFAULT 0,
  status ENUM('active','revoked') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_api_user (user_type, user_id)
);

INSERT IGNORE INTO students (id, roll_no, full_name, email, department, semester) VALUES
(1, 'ST-1001', 'Ayesha Khan', 'ayesha@example.com', 'Computer Science', 5),
(2, 'ST-1002', 'Hamza Ali', 'hamza@example.com', 'Software Engineering', 4),
(3, 'ST-1003', 'Sara Ahmed', 'sara@example.com', 'Computer Science', 6);

INSERT IGNORE INTO teachers (id, employee_no, full_name, email, department) VALUES
(1, 'TC-201', 'Dr. Nadia Malik', 'nadia@example.com', 'Computer Science'),
(2, 'TC-202', 'Mr. Usman Shah', 'usman@example.com', 'Software Engineering');

INSERT IGNORE INTO academic_marks (id, student_id, subject, marks_obtained, total_marks) VALUES
(1, 1, 'Database Systems', 87, 100),
(2, 1, 'Web Engineering', 91, 100),
(3, 2, 'Database Systems', 78, 100),
(4, 2, 'Software Design', 84, 100),
(5, 3, 'Artificial Intelligence', 89, 100),
(6, 3, 'Web Engineering', 93, 100);