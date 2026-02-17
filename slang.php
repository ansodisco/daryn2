<?php
// ============================================================
// api/slang.php — Slang endpoints
//
// GET  /api/slang.php?action=list                    — All slang
// POST /api/slang.php?action=add                     — Add slang (login required)
// POST /api/slang.php?action=learn                   — Mark slang learned (login required)
// GET  /api/slang.php?action=learned                 — My learned slang (login required)
// ============================================================

require_once __DIR__ . '/../includes/config.php';

$action = $_GET['action'] ?? '';
$db = getDB();

switch ($action) {

    // ----------------------------------------------------------
    // GET — all slang
    // ----------------------------------------------------------
    case 'list':
        $stmt = $db->query('SELECT * FROM slang ORDER BY created_at DESC');
        $slang = $stmt->fetchAll();
        
        // If logged in, mark which ones are learned
        if (!empty($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id'];
            $learnedStmt = $db->prepare(
                'SELECT slang_id FROM user_learned_slang WHERE user_id = ?'
            );
            $learnedStmt->execute([$userId]);
            $learned = array_map(fn($row) => $row['slang_id'], $learnedStmt->fetchAll());
            
            foreach ($slang as &$item) {
                $item['is_learned'] = in_array($item['id'], $learned);
            }
            unset($item);
        } else {
            foreach ($slang as &$item) {
                $item['is_learned'] = false;
            }
            unset($item);
        }
        
        jsonResponse($slang);
        break;


    // ----------------------------------------------------------
    // POST — mark slang as learned (requires login)
    // Body: {
    //   "slang_id": 1
    // }
    // ----------------------------------------------------------
    case 'learn':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $slangId = (int) ($data['slang_id'] ?? 0);

        if (!$slangId) {
            jsonResponse(['error' => 'slang_id is required'], 400);
        }

        // Verify slang exists
        $chk = $db->prepare('SELECT id FROM slang WHERE id = ?');
        $chk->execute([$slangId]);
        if (!$chk->fetch()) {
            jsonResponse(['error' => 'Slang not found'], 404);
        }

        // Insert or ignore (unique constraint handles duplicates)
        $stmt = $db->prepare(
            'INSERT IGNORE INTO user_learned_slang (user_id, slang_id, learned_at)
             VALUES (?, ?, NOW())'
        );
        $stmt->execute([$_SESSION['user_id'], $slangId]);

        // Update user stats
        $updateStmt = $db->prepare(
            'UPDATE users SET total_words_learned = (
                SELECT COUNT(*) FROM user_learned_words WHERE user_id = ?
            ) + (
                SELECT COUNT(*) FROM user_learned_slang WHERE user_id = ?
            ) WHERE id = ?'
        );
        $updateStmt->execute([$_SESSION['user_id'], $_SESSION['user_id'], $_SESSION['user_id']]);

        jsonResponse(['success' => true, 'message' => 'Slang marked as learned']);
        break;


    // ----------------------------------------------------------
    // GET — get all learned slang for current user (requires login)
    // ----------------------------------------------------------
    case 'learned':
        requireLogin();
        $userId = $_SESSION['user_id'];

        $stmt = $db->prepare(
            'SELECT s.*, uls.learned_at, uls.proficiency
             FROM slang s
             INNER JOIN user_learned_slang uls ON s.id = uls.slang_id
             WHERE uls.user_id = ?
             ORDER BY uls.learned_at DESC'
        );
        $stmt->execute([$userId]);
        jsonResponse($stmt->fetchAll());
        break;


    // ----------------------------------------------------------
    // POST — add new slang (requires login)
    // Body: {
    //   "kazakh": "Қоян",
    //   "english": "Cool",
    //   "russian": "Классно",
    //   "explanation_en": "...",          (optional)
    //   "explanation_kk": "...",          (optional)
    //   "explanation_ru": "...",          (optional)
    //   "example_sentence_kk": "...",     (optional)
    //   "example_sentence_en": "...",     (optional)
    //   "example_sentence_ru": "...",     (optional)
    //   "context_en": "...",              (optional)
    //   "context_kk": "...",              (optional)
    //   "context_ru": "..."               (optional)
    // }
    // ----------------------------------------------------------
    case 'add':
        requireLogin();
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $kazakh = trim($data['kazakh'] ?? '');
        $english = trim($data['english'] ?? '');
        $russian = trim($data['russian'] ?? '');

        if (!$kazakh || !$english || !$russian) {
            jsonResponse(['error' => 'Required fields: kazakh, english, russian'], 400);
        }

        $stmt = $db->prepare(
            'INSERT INTO slang
                (kazakh, english, russian, explanation_en, explanation_kk, explanation_ru,
                 example_sentence_kk, example_sentence_en, example_sentence_ru,
                 context_en, context_kk, context_ru)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        
        $stmt->execute([
            $kazakh,
            $english,
            $russian,
            $data['explanation_en'] ?? null,
            $data['explanation_kk'] ?? null,
            $data['explanation_ru'] ?? null,
            $data['example_sentence_kk'] ?? null,
            $data['example_sentence_en'] ?? null,
            $data['example_sentence_ru'] ?? null,
            $data['context_en'] ?? null,
            $data['context_kk'] ?? null,
            $data['context_ru'] ?? null
        ]);

        jsonResponse(['success' => true, 'id' => $db->lastInsertId()]);
        break;


    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
