USE TA_Assignment_System;

-- PROFESSORS
INSERT IGNORE INTO professor (professor_id, name)
VALUES
    (1, 'Dr. Alice Smith'),
    (2, 'Dr. Bob Johnson'),
    (3, 'Dr. Carol Lee');

-- TAs
INSERT IGNORE INTO ta (ta_id, name, program, level, background, admit_term, standing, notes, bs_school_program, ms_school_program, max_hours)
VALUES
    (1, 'Alex Thompson', 'CS', 'MS', 'Functional Programming', 'Fall 2023', 1, 'Prefers morning labs', 'CS', 'CS', 5),
    (2, 'Jamie Lee', 'CS', 'MS', 'Databases', 'Fall 2022', 2, '', 'CS', 'CS', 5),
    (3, 'Morgan Scott', 'CS', 'PhD', 'AI', 'Spring 2023', 1, '', 'CS', 'CS', 5),
    (4, 'Casey Patel', 'CS', 'MS', 'Systems', 'Fall 2023', 2, 'Has TA experience', 'EE', 'CS', 5),
    (5, 'Taylor Kim', 'CS', 'MS', 'Systems', 'Fall 2022', 1, '', 'CS', 'CS', 5),
    (6, 'Jordan Miller', 'CS', 'MS', 'Systems', 'Spring 2023', 2, '', 'CS', 'CS', 5);

-- COURSES
INSERT IGNORE INTO course (course_id, course_code, ps_lab_sections, enrollment_capacity, actual_enrollment, num_tas_requested, assigned_tas_count)
VALUES
    (1, 'COMP302', 'PS1,PS2', 120, 110, 2, 2),
    (2, 'COMP421', 'PS1', 150, 140, 3, 2),
    (3, 'COMP424', 'PS1', 200, 180, 2, 0),
    (4, 'COMP310', 'PS1,PS2', 100, 95, 2, 2),
    (5, 'COMP330', 'PS1', 80, 70, 1, 0);

INSERT INTO user (username, password, user_type, ta_id, professor_id)
VALUES 
('prof1', 'prof123', 'faculty',NULL, 1),
('ta1', 'ta123', 'student', 1, NULL),
('admin1', 'admin123', 'admin', NULL, NULL);

-- COURSE ↔ PROFESSOR
INSERT IGNORE INTO course_professor (course_id, professor_id)
VALUES
    (1,1),
    (2,1),
    (3,2),
    (4,3),
    (5,2);

-- TA ASSIGNMENTS
INSERT IGNORE INTO ta_assignment (ta_id, course_id)
VALUES
    (1,1),
    (2,2),
    (5,4),
    (6,4);

-- COURSE PREFERRED TAS
INSERT IGNORE INTO course_preferred_ta (course_id, ta_id)
VALUES
    (1,1),
    (1,3),
    (2,2),
    (2,3),
    (4,5),
    (4,6);

-- TA PREFERRED COURSES
INSERT IGNORE INTO ta_preferred_course (course_id, ta_id, interest_level)
VALUES
    (1,1,'High'),
    (1,2,'Medium'),
    (2,2,'High'),
    (2,3,'Medium'),
    (3,3,'High'),
    (3,4,'Low'),
    (4,5,'High'),
    (4,6,'High'),
    (5,1,'Medium'),
    (5,2,'Low');

-- TA PREFERRED PROFESSORS
INSERT IGNORE INTO ta_preferred_professor (ta_id, professor_id)
VALUES
    (1,1),
    (2,1),
    (3,2),
    (4,3),
    (5,3),
    (6,1);

-- PROFESSOR PREFERRED TAS
INSERT IGNORE INTO professor_preferred_ta (professor_id, ta_id)
VALUES
    (1,1),
    (1,2),
    (2,3),
    (3,5),
    (3,6);

INSERT INTO ta_skill (ta_id, skill) VALUES
(1, 'Functional Programming'),
(1, 'Scala'),
(2, 'Databases'),
(2, 'SQL');

INSERT INTO course_skill (course_id, skill) VALUES
(1, 'Functional Programming'),
(1, 'Scala'),
(2, 'Databases'),
(2, 'SQL');

-- WEIGHTS
INSERT IGNORE INTO weights (ta_pref, prof_pref, course_pref, workload_balance)
VALUES
    (1.0, 1.0, 1.0, 1.0);