<?php
// ============================================================
// api/tests.php — Course tests & trophies
//
// GET  /api/tests.php?action=questions&course_id=1   — Test questions
// POST /api/tests.php?action=submit                  — Submit answers (login required)
// GET  /api/tests.php?action=trophies                — All trophies (marks earned if logged in)
// GET  /api/tests.php?action=grammar                 — Grammar rules (optional ?difficulty=beginner)
// ============================================================

require_once __DIR__ . '/../includes/config.php';

$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {

    // ----------------------------------------------------------
    // GET — test questions for a course (correct answers hidden)
    // ----------------------------------------------------------
    case 'questions':
        $courseId = (int) ($_GET['course_id'] ?? 0);
        if (!$courseId) {
            jsonResponse(['error' => 'course_id is required'], 400);
        }

        $stmt = $db->prepare('SELECT * FROM course_tests WHERE course_id = ?');
        $stmt->execute([$courseId]);
        $questions = $stmt->fetchAll();

        foreach ($questions as &$q) {
            // Decode JSON options array
            $q['options'] = $q['options'] ? json_decode($q['options'], true) : [];
            // Never send the correct answer to the client
            unset($q['correct_answer']);
        }
        unset($q);

        jsonResponse($questions);
        break;


    // ----------------------------------------------------------
    // POST — submit answers, calculate score, award trophies
    // Body: { "course_id": 1, "answers": { "3": "42", "4": "Сәлем" } }
    // Keys in "answers" are question IDs (as strings), values are user answers
    // ----------------------------------------------------------
    case 'submit':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $courseId = (int) ($data['course_id'] ?? 0);
        $answers = $data['answers'] ?? [];

        if (!$courseId) {
            jsonResponse(['error' => 'course_id is required'], 400);
        }

        $userId = $_SESSION['user_id'];

        // Fetch all questions with correct answers
        $stmt = $db->prepare('SELECT id, correct_answer, points FROM course_tests WHERE course_id = ?');
        $stmt->execute([$courseId]);
        $questions = $stmt->fetchAll();

        if (empty($questions)) {
            jsonResponse(['error' => 'No questions found for this course'], 404);
        }

        $score = 0;
        $totalPoints = 0;
        $results = [];

        foreach ($questions as $q) {
            $qId = (string) $q['id'];
            $correctAnswer = $q['correct_answer'];
            $points = (int) $q['points'];
            $totalPoints += $points;

            // Compare answers case-insensitively, ignoring surrounding whitespace
            $userAnswer = strtolower(trim((string) ($answers[$qId] ?? '')));
            $isCorrect = $userAnswer === strtolower(trim($correctAnswer));

            if ($isCorrect) {
                $score += $points;
            }

            $results[] = [
                'question_id' => $q['id'],
                'correct' => $isCorrect,
                'correct_answer' => $correctAnswer,
            ];
        }

        $percentage = $totalPoints > 0 ? round(($score / $totalPoints) * 100, 2) : 0;
        $passed = $percentage >= 70;

        // Save the test result
        $db->prepare(
            'INSERT INTO user_test_results (user_id, course_id, score, total_points, percentage)
             VALUES (?, ?, ?, ?, ?)'
        )->execute([$userId, $courseId, $score, $totalPoints, $percentage]);

        // Award "Perfect Score" trophy if 100%
        if ($percentage == 100) {
            $db->prepare(
                'INSERT IGNORE INTO user_trophies (user_id, trophy_id)
                 SELECT ?, id FROM trophies WHERE requirement_type = "perfect_tests"'
            )->execute([$userId]);
        }

        // If first time passing this course, increment completed count and check trophies
        if ($passed) {
            $alreadyPassed = (int) $db->prepare(
                'SELECT COUNT(*) FROM user_test_results
                 WHERE user_id = ? AND course_id = ? AND percentage >= 70'
            )->execute([$userId, $courseId])
                ? $db->query(
                    "SELECT COUNT(*) FROM user_test_results
                     WHERE user_id = $userId AND course_id = $courseId AND percentage >= 70"
                )->fetchColumn()
                : 0;

            if ($alreadyPassed <= 1) {   // ≤1 because we just inserted the current result
                $db->prepare(
                    'UPDATE users SET total_courses_completed = total_courses_completed + 1 WHERE id = ?'
                )->execute([$userId]);

                // Re-read completed count and check courses_completed trophies
                $completed = (int) $db->query(
                    "SELECT total_courses_completed FROM users WHERE id = $userId"
                )->fetchColumn();

                $db->prepare(
                    'INSERT IGNORE INTO user_trophies (user_id, trophy_id)
                     SELECT ?, id FROM trophies
                     WHERE requirement_type = "courses_completed" AND requirement_value <= ?'
                )->execute([$userId, $completed]);
            }
        }

        jsonResponse([
            'score' => $score,
            'total_points' => $totalPoints,
            'percentage' => $percentage,
            'passed' => $passed,
            'results' => $results,
        ]);
        break;


    // ----------------------------------------------------------
    // GET — all trophies (marks "earned" if user is logged in)
    // ----------------------------------------------------------
    case 'trophies':
        $stmt = $db->query('SELECT * FROM trophies');
        $trophies = $stmt->fetchAll();

        if (!empty($_SESSION['user_id'])) {
            $earnedStmt = $db->prepare(
                'SELECT trophy_id FROM user_trophies WHERE user_id = ?'
            );
            $earnedStmt->execute([$_SESSION['user_id']]);
            $earnedIds = array_column($earnedStmt->fetchAll(), 'trophy_id');

            foreach ($trophies as &$trophy) {
                $trophy['earned'] = in_array($trophy['id'], $earnedIds, true);
            }
            unset($trophy);
        }

        jsonResponse($trophies);
        break;


    // ----------------------------------------------------------
    // GET — grammar rules (optional filter: ?difficulty=beginner)
    // ----------------------------------------------------------
    case 'grammar':
        $difficulty = $_GET['difficulty'] ?? '';
        $allowed = ['beginner', 'intermediate', 'advanced'];

        if ($difficulty && in_array($difficulty, $allowed, true)) {
            $stmt = $db->prepare('SELECT * FROM grammar_rules WHERE difficulty = ? ORDER BY order_index');
            $stmt->execute([$difficulty]);
        } else {
            $stmt = $db->query('SELECT * FROM grammar_rules ORDER BY order_index');
        }

        $rules = $stmt->fetchAll();

        foreach ($rules as &$rule) {
            $rule['examples'] = $rule['examples'] ? json_decode($rule['examples'], true) : [];
        }
        unset($rule);

        jsonResponse($rules);
        break;


    // ----------------------------------------------------------
    // POST — add a new test question (requires login)
    // Body: {
    //   "course_id": 1,
    //   "question_text_en": "...", "question_text_kk": "...", "question_text_ru": "...",
    //   "question_type": "multiple_choice",
    //   "correct_answer": "...",
    //   "options": ["A","B","C","D"],
    //   "points": 1
    // }
    // ----------------------------------------------------------
    case 'add_question':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $courseId = (int) ($data['course_id'] ?? 0);
        $textEn = trim($data['question_text_en'] ?? '');
        $textKk = trim($data['question_text_kk'] ?? '');
        $textRu = trim($data['question_text_ru'] ?? '');
        $qType = $data['question_type'] ?? 'multiple_choice';
        $correct = trim($data['correct_answer'] ?? '');
        $options = $data['options'] ?? [];
        $points = (int) ($data['points'] ?? 1);

        if (!$courseId || !$textEn || !$textKk || !$textRu || !$correct) {
            jsonResponse(['error' => 'Required: course_id, question_text_en/kk/ru, correct_answer'], 400);
        }

        // Verify course exists
        $chk = $db->prepare('SELECT id FROM courses WHERE id = ?');
        $chk->execute([$courseId]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Course not found'], 404);
        }

        $allowedTypes = ['multiple_choice', 'translation', 'fill_blank'];
        if (!in_array($qType, $allowedTypes, true)) {
            jsonResponse(['error' => 'question_type must be: multiple_choice, translation, or fill_blank'], 400);
        }

        $stmt = $db->prepare(
            'INSERT INTO course_tests
                (course_id, question_text_en, question_text_kk, question_text_ru, question_type, correct_answer, options, points)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $courseId,
            $textEn,
            $textKk,
            $textRu,
            $qType,
            $correct,
            json_encode($options, JSON_UNESCAPED_UNICODE),
            max(1, $points),
        ]);

        $questionId = (int) $db->lastInsertId();
        jsonResponse(['message' => 'Test question added successfully', 'question_id' => $questionId], 201);
        break;


    // ----------------------------------------------------------
    // GET — list all test questions (optional filter: ?course_id=1)
    // ----------------------------------------------------------
    case 'list_questions':
        $courseId = (int) ($_GET['course_id'] ?? 0);

        if ($courseId) {
            $stmt = $db->prepare('SELECT ct.*, c.title_en AS course_title FROM course_tests ct JOIN courses c ON ct.course_id = c.id WHERE ct.course_id = ? ORDER BY ct.id');
            $stmt->execute([$courseId]);
        } else {
            $stmt = $db->query('SELECT ct.*, c.title_en AS course_title FROM course_tests ct JOIN courses c ON ct.course_id = c.id ORDER BY ct.course_id, ct.id');
        }

        $questions = $stmt->fetchAll();

        foreach ($questions as &$q) {
            $q['options'] = $q['options'] ? json_decode($q['options'], true) : [];
        }
        unset($q);

        jsonResponse($questions);
        break;


    default:
        jsonResponse(['error' => 'Unknown action. Available: questions, submit, trophies, grammar, add_question, list_questions'], 400);
}
