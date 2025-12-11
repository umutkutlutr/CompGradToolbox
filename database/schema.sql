CREATE DATABASE IF NOT EXISTS TA_Assignment_System;
USE TA_Assignment_System;

CREATE TABLE IF NOT EXISTS professor (
    professor_id INT AUTO_INCREMENT PRIMARY KEY UNIQUE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS ta (
    ta_id INT AUTO_INCREMENT PRIMARY KEY UNIQUE,
    name VARCHAR(100) NOT NULL,
    program VARCHAR(50),
    level ENUM('MS','PhD') DEFAULT 'MS',
    background VARCHAR(100),
    admit_term VARCHAR(50),
    standing INT,
    notes TEXT,
    bs_school_program VARCHAR(150),
    ms_school_program VARCHAR(150),
    max_hours INT DEFAULT 20
);

CREATE TABLE IF NOT EXISTS user (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, -- store hashed passwords in production
    user_type ENUM('student','faculty','admin') NOT NULL,
    ta_id INT DEFAULT NULL,
    professor_id INT DEFAULT NULL,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professor(professor_id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ta_thesis_advisor (
    ta_id INT NOT NULL,
    professor_id INT NOT NULL,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professor(professor_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (ta_id, professor_id)
);

CREATE TABLE IF NOT EXISTS course (
    course_id INT AUTO_INCREMENT PRIMARY KEY UNIQUE,
    course_code VARCHAR(50) NOT NULL,
    ps_lab_sections VARCHAR(100),
    enrollment_capacity INT,
    actual_enrollment INT,
    num_tas_requested INT,
    assigned_tas_count INT
);

CREATE TABLE IF NOT EXISTS course_professor (
    course_professor_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    professor_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professor(professor_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ta_assignment (
    assignment_id INT AUTO_INCREMENT PRIMARY KEY,
    ta_id INT NOT NULL,
    course_id INT NOT NULL,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (course_id) REFERENCES course(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE (ta_id, course_id)
);

CREATE TABLE IF NOT EXISTS course_preferred_ta (
    course_id INT NOT NULL,
    ta_id INT NOT NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (course_id, ta_id)
);

CREATE TABLE IF NOT EXISTS ta_preferred_course (
    course_id INT NOT NULL,
    ta_id INT NOT NULL,
    interest_level ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
    PRIMARY KEY (course_id, ta_id),
    FOREIGN KEY (course_id) REFERENCES course(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ta_preferred_professor (
    ta_id INT NOT NULL,
    professor_id INT NOT NULL,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (professor_id) REFERENCES professor(professor_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (ta_id, professor_id)
);

CREATE TABLE IF NOT EXISTS professor_preferred_ta (
    professor_id INT NOT NULL,
    ta_id INT NOT NULL,
    FOREIGN KEY (professor_id) REFERENCES professor(professor_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (professor_id, ta_id)
);

CREATE TABLE IF NOT EXISTS ta_skill (
    ta_id INT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    FOREIGN KEY (ta_id) REFERENCES ta(ta_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (ta_id, skill)
);

CREATE TABLE IF NOT EXISTS course_skill (
    course_id INT NOT NULL,
    skill VARCHAR(100) NOT NULL,
    FOREIGN KEY (course_id) REFERENCES course(course_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    PRIMARY KEY (course_id, skill)
);

CREATE TABLE weights (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ta_pref FLOAT NOT NULL,
    prof_pref FLOAT NOT NULL,
    course_pref FLOAT NOT NULL,
    workload_balance FLOAT NOT NULL
);

CREATE TABLE activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  action VARCHAR(255) NOT NULL,
  user VARCHAR(100),
  type ENUM('success','warning','info') DEFAULT 'info',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
