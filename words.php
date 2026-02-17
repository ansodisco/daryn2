<?php
// ============================================================
// api/words.php — Words endpoints
//
// GET  /api/words.php?action=by_lesson&lesson_id=1   — Words in a lesson
// POST /api/words.php?action=add                      — Add word (login required)
// POST /api/words.php?action=learn                    — Mark word learned (login required)
// GET  /api/words.php?action=learned                  — My learned words (login required)
// ============================================================

require_once __DIR__ . '/../includes/config.php';

$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {

    // ----------------------------------------------------------
    // GET — all words for a specific lesson
    // ----------------------------------------------------------
    case 'by_lesson':
        $lessonId = (int) ($_GET['lesson_id'] ?? 0);
        if (!$lessonId) {
            jsonResponse(['error' => 'lesson_id is required'], 400);
        }

        $stmt = $db->prepare('SELECT * FROM words WHERE lesson_id = ?');
        $stmt->execute([$lessonId]);
        jsonResponse($stmt->fetchAll());
        break;


    // ----------------------------------------------------------
    // POST — add a new word to a lesson (requires login)
    // Body: {
    //   "lesson_id": 1,
    //   "kazakh": "Сәлем",
    //   "english": "Hello",
    //   "russian": "Привет",
    //   "pronunciation": "salem",          (optional)
    //   "example_sentence_kk": "...",      (optional)
    //   "example_sentence_en": "...",      (optional)
    //   "example_sentence_ru": "...",      (optional)
    //   "word_type": "greeting"            (optional)
    // }
    // ----------------------------------------------------------
    case 'add':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $lessonId = (int) ($data['lesson_id'] ?? 0);
        $kazakh = trim($data['kazakh'] ?? '');
        $english = trim($data['english'] ?? '');
        $russian = trim($data['russian'] ?? '');

        if (!$lessonId || !$kazakh || !$english || !$russian) {
            jsonResponse(['error' => 'Required fields: lesson_id, kazakh, english, russian'], 400);
        }

        // Verify lesson exists
        $chk = $db->prepare('SELECT id FROM lessons WHERE id = ?');
        $chk->execute([$lessonId]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Lesson not found'], 404);
        }

        $stmt = $db->prepare(
            'INSERT INTO words
                (lesson_id, kazakh, english, russian, pronunciation,
                 example_sentence_kk, example_sentence_en, example_sentence_ru, word_type)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $lessonId,
            $kazakh,
            $english,
            $russian,
            trim($data['pronunciation'] ?? ''),
            trim($data['example_sentence_kk'] ?? ''),
            trim($data['example_sentence_en'] ?? ''),
            trim($data['example_sentence_ru'] ?? ''),
            trim($data['word_type'] ?? ''),
        ]);

        $wordId = (int) $db->lastInsertId();
        jsonResponse(['message' => 'Word added successfully', 'word_id' => $wordId], 201);
        break;


    // ----------------------------------------------------------
    // POST — mark a word as learned (requires login)
    // Body: { "word_id": 5 }
    // ----------------------------------------------------------
    case 'learn':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $wordId = (int) ($data['word_id'] ?? 0);

        if (!$wordId) {
            jsonResponse(['error' => 'word_id is required'], 400);
        }

        $userId = $_SESSION['user_id'];

        // Upsert into user_learned_words
        $stmt = $db->prepare(
            'INSERT INTO user_learned_words (user_id, word_id, proficiency)
             VALUES (?, ?, 1)
             ON DUPLICATE KEY UPDATE proficiency = proficiency'   // keep existing proficiency
        );
        $stmt->execute([$userId, $wordId]);

        // Sync total_words_learned count on the user row
        $db->prepare(
            'UPDATE users
             SET total_words_learned = (
                 SELECT COUNT(*) FROM user_learned_words WHERE user_id = ?
             )
             WHERE id = ?'
        )->execute([$userId, $userId]);

        // Update day streak on word learning
        updateStreak($userId);

        // Check trophy: 100 words
        $totalLearned = (int) $db->prepare(
            'SELECT total_words_learned FROM users WHERE id = ?'
        )->execute([$userId]) && true
            ? $db->query("SELECT total_words_learned FROM users WHERE id = $userId")->fetchColumn()
            : 0;

        if ($totalLearned >= 100) {
            $db->prepare(
                'INSERT IGNORE INTO user_trophies (user_id, trophy_id)
                 SELECT ?, id FROM trophies WHERE requirement_type = "words_learned" AND requirement_value <= ?'
            )->execute([$userId, $totalLearned]);
        }

        jsonResponse(['message' => 'Word marked as learned', 'total_learned' => $totalLearned]);
        break;


    // ----------------------------------------------------------
    // GET — get all words the current user has learned (requires login)
    // ----------------------------------------------------------
    case 'learned':
        requireLogin();
        $userId = $_SESSION['user_id'];

        $stmt = $db->prepare(
            'SELECT w.*, ulw.learned_at, ulw.proficiency
             FROM words w
             JOIN user_learned_words ulw ON w.id = ulw.word_id
             WHERE ulw.user_id = ?
             ORDER BY ulw.learned_at DESC'
        );
        $stmt->execute([$userId]);
        jsonResponse($stmt->fetchAll());
        break;


    default:
        jsonResponse(['error' => 'Unknown action. Available: by_lesson, add, learn, learned'], 400);
}
