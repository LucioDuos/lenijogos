<?php
declare(strict_types=1);

function env_required(string $name): string {
    $value = getenv($name);
    if ($value === false || $value === '') {
        throw new RuntimeException("Variável de ambiente obrigatória ausente: {$name}");
    }
    return $value;
}

function db(): PDO {
    static $pdo;
    if ($pdo instanceof PDO) return $pdo;
    $host = getenv('JOGOS_DB_HOST') ?: 'localhost';
    $port = getenv('JOGOS_DB_PORT') ?: '3306';
    $database = env_required('JOGOS_DB_NAME');
    $username = env_required('JOGOS_DB_USER');
    $password = env_required('JOGOS_DB_PASSWORD');
    $pdo = new PDO("mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function json_response(array $payload, int $status = 200): never {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function input(): array {
    $data = json_decode((string) file_get_contents('php://input'), true);
    return is_array($data) ? $data : [];
}

function normalized_phone(string $phone): string {
    $digits = preg_replace('/\D+/', '', $phone) ?: '';
    if (strlen($digits) < 10 || strlen($digits) > 15) json_response(['error' => 'Informe um celular válido com DDD.'], 422);
    return $digits;
}

function bearer_token(): string {
    $headers = [
        $_SERVER['HTTP_AUTHORIZATION'] ?? '',
        $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '',
        $_SERVER['Authorization'] ?? '',
    ];
    if (function_exists('getallheaders')) {
        $requestHeaders = getallheaders();
        $headers[] = $requestHeaders['Authorization'] ?? $requestHeaders['authorization'] ?? '';
    }
    foreach ($headers as $header) {
        if (preg_match('/^Bearer\s+(.+)$/i', trim((string) $header), $matches)) return trim($matches[1]);
    }
    $fallback = trim((string) ($_SERVER['HTTP_X_LENI_TOKEN'] ?? ''));
    if ($fallback !== '') return $fallback;
    json_response(['error' => 'Autenticação obrigatória.'], 401);
}

function current_user(): array {
    $hash = hash('sha256', bearer_token());
    $stmt = db()->prepare('SELECT u.id, u.nickname, u.phone FROM user_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > NOW()');
    $stmt->execute([$hash]);
    $user = $stmt->fetch();
    if (!$user) json_response(['error' => 'Sessão expirada.'], 401);
    return $user;
}

function issue_session(int $userId): string {
    $token = bin2hex(random_bytes(32));
    $stmt = db()->prepare('INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))');
    $stmt->execute([$userId, hash('sha256', $token)]);
    return $token;
}
