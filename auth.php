<?php
// ============================================================
// api/auth.php — Registration, Login, Logout, Session check
// Usage: POST /api/auth.php?action=register|login|logout
//        GET  /api/auth.php?action=check
// ============================================================

require_once __DIR__ . '/../includes/config.php';

$action = $_GET['action'] ?? '';

switch ($action) {

    // ----------------------------------------------------------
    // POST /api/auth.php?action=register
    // Body: { "username": "...", "email": "...", "password": "..." }
    // ----------------------------------------------------------
    case 'register':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $username = trim($data['username'] ?? '');
        $email = trim($data['email'] ?? '');
        $password = $data['password'] ?? '';

        // Validation
        if (!$username || !$email || !$password) {
            jsonResponse(['error' => 'All fields are required: username, email, password'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonResponse(['error' => 'Invalid email address'], 400);
        }
        if (strlen($password) < 6) {
            jsonResponse(['error' => 'Password must be at least 6 characters'], 400);
        }

        $db = getDB();

        // Check for duplicates first to give a clear error message
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? OR email = ?');
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) {
            jsonResponse(['error' => 'Username or email is already taken'], 400);
        }

        // Insert new user
        $stmt = $db->prepare(
            'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)'
        );
        $stmt->execute([$username, $email, hashPassword($password)]);
        $userId = (int) $db->lastInsertId();

        // Auto-login after registration
        $_SESSION['user_id'] = $userId;
        $_SESSION['username'] = $username;

        jsonResponse([
            'message' => 'Registration successful',
            'user_id' => $userId,
            'username' => $username,
        ], 201);
        break;


    // ----------------------------------------------------------
    // POST /api/auth.php?action=login
    // Body: { "username": "...", "password": "..." }
    // ----------------------------------------------------------
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            jsonResponse(['error' => 'Method not allowed. Use POST.'], 405);
        }

        $data = getJsonBody();
        $username = trim($data['username'] ?? '');
        $password = $data['password'] ?? '';

        if (!$username || !$password) {
            jsonResponse(['error' => 'Username and password are required'], 400);
        }

        $db = getDB();
        $stmt = $db->prepare(
            'SELECT id, username, email FROM users WHERE username = ? AND password_hash = ?'
        );
        $stmt->execute([$username, hashPassword($password)]);
        $user = $stmt->fetch();

        if (!$user) {
            jsonResponse(['error' => 'Invalid username or password'], 401);
        }

        // Update last login timestamp
        $db->prepare('UPDATE users SET last_login = NOW() WHERE id = ?')
            ->execute([$user['id']]);

        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];

        // Update day streak on login (non-critical — don't let it break login)
        try {
            updateStreak($user['id']);
        } catch (Exception $e) {
            // Streak update failed — log but don't break login
            error_log('updateStreak failed for user ' . $user['id'] . ': ' . $e->getMessage());
        }

        jsonResponse([
            'message' => 'Login successful',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
            ],
        ]);
        break;


    // ----------------------------------------------------------
    // POST /api/auth.php?action=logout
    // ----------------------------------------------------------
    case 'logout':
        session_unset();
        session_destroy();
        jsonResponse(['message' => 'Logged out successfully']);
        break;


    // ----------------------------------------------------------
    // GET /api/auth.php?action=check
    // Returns whether the user is currently logged in
    // ----------------------------------------------------------
    case 'check':
        if (!empty($_SESSION['user_id'])) {
            jsonResponse([
                'authenticated' => true,
                'user_id' => $_SESSION['user_id'],
                'username' => $_SESSION['username'],
            ]);
        } else {
            jsonResponse(['authenticated' => false]);
        }
        break;


    default:
        jsonResponse(['error' => 'Unknown action. Available: register, login, logout, check'], 400);
}
