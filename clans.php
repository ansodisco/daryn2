<?php
/**
 * TilTalk — Clans API
 * Endpoints: list, top5, top_players, create, join, leave, my_clan
 */

session_start();
require_once __DIR__ . '/../includes/config.php';

$db = getDB();
$action = $_GET['action'] ?? '';

switch ($action) {

    // ─── List all clans ──────────────────────────────────
    case 'list':
        $stmt = $db->query('
            SELECT c.*, 
                   u.username AS leader_name,
                   (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) AS member_count
            FROM clans c
            JOIN users u ON u.id = c.created_by
            ORDER BY c.total_points DESC
        ');
        $clans = $stmt->fetchAll();
        jsonResponse($clans);
        break;

    // ─── Top 5 clans ─────────────────────────────────────
    case 'top5':
        $stmt = $db->query('
            SELECT c.id, c.name, c.total_points,
                   (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) AS member_count
            FROM clans c
            ORDER BY c.total_points DESC
            LIMIT 5
        ');
        jsonResponse($stmt->fetchAll());
        break;

    // ─── Top players by points ───────────────────────────
    case 'top_players':
        $stmt = $db->query('
            SELECT u.id, u.username, COALESCE(u.points, 0) AS points,
                   (SELECT c.name FROM clans c 
                    JOIN clan_members cm ON cm.clan_id = c.id 
                    WHERE cm.user_id = u.id LIMIT 1) AS clan_name
            FROM users u
            ORDER BY u.points DESC
            LIMIT 20
        ');
        jsonResponse($stmt->fetchAll());
        break;

    // ─── Create clan ─────────────────────────────────────
    case 'create':
        requireLogin();
        $data = json_decode(file_get_contents('php://input'), true);
        $name = trim($data['name'] ?? '');
        $desc = trim($data['description'] ?? '');

        if (strlen($name) < 2 || strlen($name) > 100) {
            jsonResponse(['error' => 'Clan name must be 2–100 characters'], 400);
        }

        // Check user not already in a clan
        $check = $db->prepare('SELECT id FROM clan_members WHERE user_id = ?');
        $check->execute([$_SESSION['user_id']]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'You are already in a clan. Leave first.'], 400);
        }

        // Check unique name
        $dup = $db->prepare('SELECT id FROM clans WHERE name = ?');
        $dup->execute([$name]);
        if ($dup->fetch()) {
            jsonResponse(['error' => 'Clan name already taken'], 400);
        }

        $ins = $db->prepare('INSERT INTO clans (name, description, created_by) VALUES (?, ?, ?)');
        $ins->execute([$name, $desc, $_SESSION['user_id']]);
        $clanId = $db->lastInsertId();

        // Auto-join as leader
        $join = $db->prepare('INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, "leader")');
        $join->execute([$clanId, $_SESSION['user_id']]);

        jsonResponse(['success' => true, 'clan_id' => $clanId]);
        break;

    // ─── Join clan ───────────────────────────────────────
    case 'join':
        requireLogin();
        $data = json_decode(file_get_contents('php://input'), true);
        $clanId = (int) ($data['clan_id'] ?? 0);

        if (!$clanId) {
            jsonResponse(['error' => 'Clan ID required'], 400);
        }

        // Check user not already in a clan
        $check = $db->prepare('SELECT id FROM clan_members WHERE user_id = ?');
        $check->execute([$_SESSION['user_id']]);
        if ($check->fetch()) {
            jsonResponse(['error' => 'You are already in a clan. Leave first.'], 400);
        }

        // Verify clan exists
        $cv = $db->prepare('SELECT id FROM clans WHERE id = ?');
        $cv->execute([$clanId]);
        if (!$cv->fetch()) {
            jsonResponse(['error' => 'Clan not found'], 404);
        }

        $join = $db->prepare('INSERT INTO clan_members (clan_id, user_id, role) VALUES (?, ?, "member")');
        $join->execute([$clanId, $_SESSION['user_id']]);

        jsonResponse(['success' => true]);
        break;

    // ─── Leave clan ──────────────────────────────────────
    case 'leave':
        requireLogin();
        $del = $db->prepare('DELETE FROM clan_members WHERE user_id = ?');
        $del->execute([$_SESSION['user_id']]);
        jsonResponse(['success' => true]);
        break;

    // ─── My clan info ────────────────────────────────────
    case 'my_clan':
        requireLogin();
        $stmt = $db->prepare('
            SELECT c.*, cm.role,
                   (SELECT COUNT(*) FROM clan_members WHERE clan_id = c.id) AS member_count
            FROM clan_members cm
            JOIN clans c ON c.id = cm.clan_id
            WHERE cm.user_id = ?
        ');
        $stmt->execute([$_SESSION['user_id']]);
        $clan = $stmt->fetch();

        if (!$clan) {
            jsonResponse(null);
        } else {
            // Get members
            $mstmt = $db->prepare('
                SELECT u.username, cm.role, COALESCE(u.points, 0) AS points
                FROM clan_members cm
                JOIN users u ON u.id = cm.user_id
                WHERE cm.clan_id = ?
                ORDER BY u.points DESC
            ');
            $mstmt->execute([$clan['id']]);
            $clan['members'] = $mstmt->fetchAll();
            jsonResponse($clan);
        }
        break;

    // ─── Award points (internal helper) ──────────────────
    case 'award_points':
        requireLogin();
        $data = json_decode(file_get_contents('php://input'), true);
        $pts = (int) ($data['points'] ?? 0);
        $source = $data['source'] ?? 'unknown';

        if ($pts <= 0) {
            jsonResponse(['error' => 'Invalid points'], 400);
        }

        // Log
        $log = $db->prepare('INSERT INTO user_points (user_id, points, source) VALUES (?, ?, ?)');
        $log->execute([$_SESSION['user_id'], $pts, $source]);

        // Update user total
        $upd = $db->prepare('UPDATE users SET points = COALESCE(points, 0) + ? WHERE id = ?');
        $upd->execute([$pts, $_SESSION['user_id']]);

        // Update clan total
        $clan = $db->prepare('SELECT clan_id FROM clan_members WHERE user_id = ?');
        $clan->execute([$_SESSION['user_id']]);
        $clanRow = $clan->fetch();
        if ($clanRow) {
            $cupd = $db->prepare('UPDATE clans SET total_points = total_points + ? WHERE id = ?');
            $cupd->execute([$pts, $clanRow['clan_id']]);
        }

        jsonResponse(['success' => true, 'new_points' => $pts]);
        break;

    default:
        jsonResponse(['error' => 'Unknown action'], 400);
}
