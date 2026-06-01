<?php
declare(strict_types=1);
require __DIR__ . '/config.php';

$action = $_GET['action'] ?? '';
try {
    if ($action === 'register') {
        $data = input(); $phone = normalized_phone((string) ($data['phone'] ?? '')); $nickname = trim((string) ($data['nickname'] ?? '')); $password = (string) ($data['password'] ?? '');
        if (mb_strlen($nickname) < 2 || mb_strlen($nickname) > 30) json_response(['error' => 'O apelido deve ter entre 2 e 30 caracteres.'], 422);
        if (strlen($password) < 8) json_response(['error' => 'A senha deve ter pelo menos 8 caracteres.'], 422);
        $stmt = db()->prepare('INSERT INTO users (phone, nickname, password_hash) VALUES (?, ?, ?)');
        $stmt->execute([$phone, $nickname, password_hash($password, PASSWORD_DEFAULT)]);
        json_response(['token' => issue_session((int) db()->lastInsertId()), 'user' => ['phone' => $phone, 'nickname' => $nickname]], 201);
    }
    if ($action === 'login') {
        $data = input(); $phone = normalized_phone((string) ($data['phone'] ?? '')); $stmt = db()->prepare('SELECT id, nickname, phone, password_hash FROM users WHERE phone = ?'); $stmt->execute([$phone]); $user = $stmt->fetch();
        if (!$user || !password_verify((string) ($data['password'] ?? ''), $user['password_hash'])) json_response(['error' => 'Celular ou senha inválidos.'], 401);
        json_response(['token' => issue_session((int) $user['id']), 'user' => ['phone' => $user['phone'], 'nickname' => $user['nickname']]]);
    }
    if ($action === 'me') json_response(['user' => current_user()]);
    if ($action === 'logout') { $hash = hash('sha256', bearer_token()); db()->prepare('DELETE FROM user_sessions WHERE token_hash = ?')->execute([$hash]); json_response(['ok' => true]); }
    if ($action === 'event') {
        $user = current_user(); $data = input(); $game = trim((string) ($data['game'] ?? '')); $type = trim((string) ($data['type'] ?? '')); $allowed = ['open','close','progress','win','loss'];
        if (!preg_match('/^[a-z-]{2,40}$/', $game) || !in_array($type, $allowed, true)) json_response(['error' => 'Evento inválido.'], 422);
        $seconds = max(0, min(86400, (int) ($data['seconds'] ?? 0))); $payload = json_encode($data['payload'] ?? [], JSON_UNESCAPED_UNICODE);
        db()->prepare('INSERT INTO game_events (user_id, game_key, event_type, duration_seconds, payload) VALUES (?, ?, ?, ?, ?)')->execute([$user['id'], $game, $type, $seconds, $payload]);
        db()->prepare("INSERT INTO game_statistics (user_id, game_key, visits, seconds_played, wins, losses, last_accessed_at) VALUES (?, ?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE visits = visits + IF(? = 'open', 1, 0), seconds_played = seconds_played + VALUES(seconds_played), wins = wins + VALUES(wins), losses = losses + VALUES(losses), last_accessed_at = NOW()")->execute([$user['id'], $game, $type === 'open' ? 1 : 0, $seconds, $type === 'win' ? 1 : 0, $type === 'loss' ? 1 : 0, $type]);
        json_response(['ok' => true]);
    }
    if ($action === 'progress') {
        $user = current_user(); $data = input(); $game = trim((string) ($data['game'] ?? $_GET['game'] ?? '')); if (!preg_match('/^[a-z-]{2,40}$/', $game)) json_response(['error' => 'Jogo inválido.'], 422);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') { $stmt = db()->prepare('SELECT progress FROM game_progress WHERE user_id = ? AND game_key = ?'); $stmt->execute([$user['id'], $game]); json_response(['progress' => json_decode((string) ($stmt->fetchColumn() ?: '{}'), true)]); }
        $progress = json_encode($data['progress'] ?? [], JSON_UNESCAPED_UNICODE); db()->prepare('INSERT INTO game_progress (user_id, game_key, progress) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE progress = VALUES(progress), updated_at = NOW()')->execute([$user['id'], $game, $progress]); json_response(['ok' => true]);
    }
    if ($action === 'ranking') { current_user(); $rows = db()->query('SELECT u.nickname, SUM(s.wins) wins, SUM(s.seconds_played) seconds_played FROM game_statistics s JOIN users u ON u.id=s.user_id GROUP BY u.id ORDER BY wins DESC, seconds_played DESC LIMIT 50')->fetchAll(); json_response(['ranking' => $rows]); }
    if ($action === 'ws-token') { $user = current_user(); $expires = time() + 300; $body = base64_encode(json_encode(['userId' => (int) $user['id'], 'nickname' => $user['nickname'], 'exp' => $expires])); $signature = hash_hmac('sha256', $body, env_required('JOGOS_WS_SECRET')); json_response(['token' => "{$body}.{$signature}", 'url' => getenv('JOGOS_WS_URL') ?: 'ws://localhost:8081']); }
    json_response(['error' => 'Rota inexistente.'], 404);
} catch (PDOException $exception) {
    if ((string) $exception->getCode() === '23000') json_response(['error' => 'Celular já cadastrado.'], 409);
    json_response(['error' => 'Falha temporária no banco de dados.'], 500);
} catch (Throwable $exception) { json_response(['error' => 'Falha interna.'], 500); }
