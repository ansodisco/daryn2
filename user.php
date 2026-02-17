<?php
// ============================================================
// api/user.php — User profile & stats
//
// GET /api/user.php?action=profile   — Current user profile (login required)
// GET /api/user.php?action=stats     — User stats + trophies (login required)
// POST/api/user.php?action=update    — Update profile (login required)
// ============================================================

require_once __DIR__ . '/../includes/config.php';

requireLogin();   // All user endpoints require a logged-in session

$action = $_GET['action'] ?? '';
$db = getDB();
$userId = $_SESSION['user_id'];

switch ($action) {

    // ----------------------------------------------------------
    // GET — user profile
    // ----------------------------------------------------------
    case 'profile':
        $stmt = $db->prepare(
            'SELECT id, username, email, streak_days, total_words_learned,
                    total_courses_completed, total_trophies, current_theme, created_at
             FROM users WHERE id = ?'
        );
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['error' => 'User not found'], 404);
        }

        jsonResponse($user);
        break;


    // ----------------------------------------------------------
    // GET — user stats (progress + earned trophies)
    // ----------------------------------------------------------
    case 'stats':
        $stmt = $db->prepare(
            'SELECT streak_days, total_words_learned, total_courses_completed, total_trophies
             FROM users WHERE id = ?'
        );
        $stmt->execute([$userId]);
        $stats = $stmt->fetch();

        // Overall progress as a percentage of all courses
        $totalCourses = (int) $db->query('SELECT COUNT(*) FROM courses')->fetchColumn();
        $stats['overall_progress'] = $totalCourses > 0
            ? round(($stats['total_courses_completed'] / $totalCourses) * 100)
            : 0;

        // Earned trophies
        $tStmt = $db->prepare(
            'SELECT t.id, t.name_en, t.name_kk, t.name_ru, t.icon, ut.earned_at
             FROM trophies t
             JOIN user_trophies ut ON t.id = ut.trophy_id
             WHERE ut.user_id = ?
             ORDER BY ut.earned_at DESC'
        );
        $tStmt->execute([$userId]);
        $stats['earned_trophies'] = $tStmt->fetchAll();

        jsonResponse($stats);
        break;


    // ----------------------------------------------------------
    // POST — update user profile fields
    // Body: { "username": "...", "email": "...", "current_theme": "..." }
    //       (all fields are optional; only provided ones are updated)
    // ----------------------------------------------------------
    case 'update':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $updates = [];
        $params = [];

        if (isset($data['username'])) {
            $username = trim($data['username']);
            if (!$username) {
                jsonResponse(['error' => 'Username cannot be empty'], 400);
            }
            $updates[] = 'username = ?';
            $params[] = $username;
        }

        if (isset($data['email'])) {
            $email = trim($data['email']);
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                jsonResponse(['error' => 'Invalid email address'], 400);
            }
            $updates[] = 'email = ?';
            $params[] = $email;
        }

        if (isset($data['current_theme'])) {
            $updates[] = 'current_theme = ?';
            $params[] = trim($data['current_theme']);
        }

        if (empty($updates)) {
            jsonResponse(['error' => 'No fields provided to update'], 400);
        }

        $params[] = $userId;   // for the WHERE clause
        $sql = 'UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?';

        try {
            $db->prepare($sql)->execute($params);
        } catch (\PDOException $e) {
            // Duplicate username / email
            jsonResponse(['error' => 'Username or email is already taken'], 400);
        }

        jsonResponse(['message' => 'Profile updated successfully']);
        break;


    // ----------------------------------------------------------
    // POST — manually trigger streak update (requires login)
    // ----------------------------------------------------------
    case 'update_streak':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        updateStreak($userId);
        jsonResponse(['message' => 'Streak updated']);
        break;


    default:
        jsonResponse(['error' => 'Unknown action. Available: profile, stats, update, update_streak'], 400);
}
