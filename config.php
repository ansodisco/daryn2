<?php
// ============================================================
// config.php — Database connection settings
// Edit DB_HOST, DB_NAME, DB_USER, DB_PASS to match your server
// ============================================================

define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'kazakh_learning');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Prevent PHP notices/warnings from breaking JSON responses
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Session secret (change this to a random string in production)
define('SESSION_SECRET', '69390');

// OpenAI API Key (Keep this secret and DO NOT commit to Git)
define('OPENAI_API_KEY', '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');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Returns a PDO database connection.
 * Uses a singleton pattern so we only connect once per request.
 */
function getDB(): PDO
{
    static $pdo = null;

    if ($pdo === null) {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,   // Throw exceptions on errors
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,         // Return arrays by default
            PDO::ATTR_EMULATE_PREPARES => false,                    // Use real prepared statements
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            // In production, log this instead of displaying it
            die(json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]));
        }
    }

    return $pdo;
}

/**
 * Hash a password with SHA-256 (same algorithm as the original Python app).
 */
function hashPassword(string $password): string
{
    return hash('sha256', $password);
}

/**
 * Return JSON response and exit.
 */
function jsonResponse(mixed $data, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Check if a user is logged in. If not, return 401 JSON error.
 */
function requireLogin(): void
{
    if (empty($_SESSION['user_id'])) {
        jsonResponse(['error' => 'Not authenticated. Please log in.'], 401);
    }
}

/**
 * Get JSON body from request (for API calls).
 */
function getJsonBody(): array
{
    $body = file_get_contents('php://input');
    $data = json_decode($body, true);
    return is_array($data) ? $data : [];
}

/**
 * Update the user's day streak.
 * - If last_activity_date is yesterday → increment streak_days
 * - If last_activity_date is today    → no change
 * - Otherwise (null or older)         → reset streak_days to 1
 * Always sets last_activity_date = today.
 */
function updateStreak(int $userId): void
{
    try {
        $db = getDB();
        $stmt = $db->prepare(
            'SELECT streak_days, last_activity_date FROM users WHERE id = ?'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch();

        if (!$row)
            return;

        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $lastDate = $row['last_activity_date'] ?? null;
        $streak = (int) ($row['streak_days'] ?? 0);

        if ($lastDate === $today) {
            // Already updated today — do nothing
            return;
        } elseif ($lastDate === $yesterday) {
            $streak++;
        } else {
            $streak = 1;
        }

        $db->prepare(
            'UPDATE users SET streak_days = ?, last_activity_date = ? WHERE id = ?'
        )->execute([$streak, $today, $userId]);

        // Check streak trophy (7 Day Streak)
        if ($streak >= 7) {
            $db->prepare(
                'INSERT IGNORE INTO user_trophies (user_id, trophy_id)
                 SELECT ?, id FROM trophies WHERE requirement_type = "streak_days" AND requirement_value <= ?'
            )->execute([$userId, $streak]);
        }
    } catch (Exception $e) {
        // Log but don't crash — streak is non-critical
        error_log('updateStreak error: ' . $e->getMessage());
    }
}
