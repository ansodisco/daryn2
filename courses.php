<?php
// ============================================================
// api/courses.php — Courses & Lessons endpoints
//
// GET    /api/courses.php?action=list               — All courses
// GET    /api/courses.php?action=get&id=1           — Single course with lessons
// GET    /api/courses.php?action=lesson&id=1        — Single lesson with words
// POST   /api/courses.php?action=complete_lesson    — Mark lesson complete (login required)
// POST   /api/courses.php?action=add                — Add new course (login required)
// POST   /api/courses.php?action=add_lesson         — Add lesson to course (login required)
// ============================================================

require_once __DIR__ . '/../includes/config.php';

$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {

    // ----------------------------------------------------------
    // GET — list all courses (with user progress if logged in)
    // ----------------------------------------------------------
    case 'list':
        $stmt = $db->query('SELECT * FROM courses ORDER BY order_index');
        $courses = $stmt->fetchAll();

        // If logged in, attach per-course progress
        if (!empty($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id'];
            foreach ($courses as &$course) {
                $prog = $db->prepare(
                    'SELECT COUNT(*) AS completed FROM user_progress
                     WHERE user_id = ? AND course_id = ? AND completed = 1'
                );
                $prog->execute([$userId, $course['id']]);
                $completed = (int) $prog->fetchColumn();
                $totalLessons = max(1, (int) $course['total_lessons']);
                $course['completed_lessons'] = $completed;
                $course['progress'] = round(($completed / $totalLessons) * 100);
            }
            unset($course);
        }

        jsonResponse($courses);
        break;


    // ----------------------------------------------------------
    // GET — single course details + its lessons
    // ----------------------------------------------------------
    case 'get':
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            jsonResponse(['error' => 'Course ID is required'], 400);
        }

        $stmt = $db->prepare('SELECT * FROM courses WHERE id = ?');
        $stmt->execute([$id]);
        $course = $stmt->fetch();

        if (!$course) {
            jsonResponse(['error' => 'Course not found'], 404);
        }

        // Attach lessons
        $lstmt = $db->prepare('SELECT * FROM lessons WHERE course_id = ? ORDER BY lesson_order');
        $lstmt->execute([$id]);
        $course['lessons'] = $lstmt->fetchAll();

        jsonResponse($course);
        break;


    // ----------------------------------------------------------
    // GET — single lesson + its words
    // ----------------------------------------------------------
    case 'lesson':
        $id = (int) ($_GET['id'] ?? 0);
        if (!$id) {
            jsonResponse(['error' => 'Lesson ID is required'], 400);
        }

        $stmt = $db->prepare('SELECT * FROM lessons WHERE id = ?');
        $stmt->execute([$id]);
        $lesson = $stmt->fetch();

        if (!$lesson) {
            jsonResponse(['error' => 'Lesson not found'], 404);
        }

        $wstmt = $db->prepare('SELECT * FROM words WHERE lesson_id = ?');
        $wstmt->execute([$id]);
        $lesson['words'] = $wstmt->fetchAll();

        jsonResponse($lesson);
        break;


    // ----------------------------------------------------------
    // POST — mark lesson as completed (requires login)
    // Body: { "lesson_id": 1 }
    // ----------------------------------------------------------
    case 'complete_lesson':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $lessonId = (int) ($data['lesson_id'] ?? 0);

        if (!$lessonId) {
            jsonResponse(['error' => 'lesson_id is required'], 400);
        }

        // Get course_id for this lesson
        $stmt = $db->prepare('SELECT course_id FROM lessons WHERE id = ?');
        $stmt->execute([$lessonId]);
        $row = $stmt->fetch();

        if (!$row) {
            jsonResponse(['error' => 'Lesson not found'], 404);
        }

        $userId = $_SESSION['user_id'];
        $courseId = $row['course_id'];

        // Insert or update progress record
        $stmt = $db->prepare(
            'INSERT INTO user_progress (user_id, course_id, lesson_id, completed, completed_at)
             VALUES (?, ?, ?, 1, NOW())
             ON DUPLICATE KEY UPDATE completed = 1, completed_at = NOW()'
        );
        $stmt->execute([$userId, $courseId, $lessonId]);

        // Update day streak on lesson completion
        updateStreak($userId);

        jsonResponse(['message' => 'Lesson marked as completed']);
        break;


    // ----------------------------------------------------------
    // POST — add a new course (requires login)
    // Body: {
    //   "title_en": "...", "title_kk": "...", "title_ru": "...",
    //   "description_en": "...", "description_kk": "...", "description_ru": "...",
    //   "level": "beginner|intermediate|advanced"
    // }
    // ----------------------------------------------------------
    case 'add':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();

        $titleEn = trim($data['title_en'] ?? '');
        $titleKk = trim($data['title_kk'] ?? '');
        $titleRu = trim($data['title_ru'] ?? '');
        $level = $data['level'] ?? '';

        if (!$titleEn || !$titleKk || !$titleRu || !$level) {
            jsonResponse(['error' => 'Required: title_en, title_kk, title_ru, level'], 400);
        }

        $allowedLevels = ['beginner', 'intermediate', 'advanced'];
        if (!in_array($level, $allowedLevels, true)) {
            jsonResponse(['error' => 'level must be: beginner, intermediate, or advanced'], 400);
        }

        // Find the next order_index
        $maxOrder = (int) $db->query('SELECT COALESCE(MAX(order_index), 0) FROM courses')->fetchColumn();

        $stmt = $db->prepare(
            'INSERT INTO courses
                (title_en, title_kk, title_ru, description_en, description_kk, description_ru, level, order_index)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $titleEn,
            $titleKk,
            $titleRu,
            trim($data['description_en'] ?? ''),
            trim($data['description_kk'] ?? ''),
            trim($data['description_ru'] ?? ''),
            $level,
            $maxOrder + 1,
        ]);

        $courseId = (int) $db->lastInsertId();
        jsonResponse(['message' => 'Course created successfully', 'course_id' => $courseId], 201);
        break;


    // ----------------------------------------------------------
    // POST — add a lesson to an existing course (requires login)
    // Body: {
    //   "course_id": 1,
    //   "title_en": "...", "title_kk": "...", "title_ru": "...",
    //   "content_en": "...", "content_kk": "...", "content_ru": "..."
    // }
    // ----------------------------------------------------------
    case 'add_lesson':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $courseId = (int) ($data['course_id'] ?? 0);
        $titleEn = trim($data['title_en'] ?? '');
        $titleKk = trim($data['title_kk'] ?? '');
        $titleRu = trim($data['title_ru'] ?? '');

        if (!$courseId || !$titleEn || !$titleKk || !$titleRu) {
            jsonResponse(['error' => 'Required: course_id, title_en, title_kk, title_ru'], 400);
        }

        // Verify course exists
        $chk = $db->prepare('SELECT id FROM courses WHERE id = ?');
        $chk->execute([$courseId]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Course not found'], 404);
        }

        // Find next lesson_order within this course
        $maxOrder = (int) $db->prepare(
            'SELECT COALESCE(MAX(lesson_order), 0) FROM lessons WHERE course_id = ?'
        )->execute([$courseId]) && true
            ? $db->query("SELECT COALESCE(MAX(lesson_order), 0) FROM lessons WHERE course_id = $courseId")->fetchColumn()
            : 0;

        $stmt = $db->prepare(
            'INSERT INTO lessons (course_id, title_en, title_kk, title_ru, content_en, content_kk, content_ru, lesson_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $courseId,
            $titleEn,
            $titleKk,
            $titleRu,
            trim($data['content_en'] ?? ''),
            trim($data['content_kk'] ?? ''),
            trim($data['content_ru'] ?? ''),
            $maxOrder + 1,
        ]);

        $lessonId = (int) $db->lastInsertId();

        // Keep total_lessons in sync
        $db->prepare(
            'UPDATE courses SET total_lessons = (SELECT COUNT(*) FROM lessons WHERE course_id = ?) WHERE id = ?'
        )->execute([$courseId, $courseId]);

        jsonResponse(['message' => 'Lesson added successfully', 'lesson_id' => $lessonId], 201);
        break;


    default:
        jsonResponse(['error' => 'Unknown action. Available: list, get, lesson, complete_lesson, add, add_lesson'], 400);
}
