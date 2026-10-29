<?php
if (realpath(__FILE__) === realpath($_SERVER['SCRIPT_FILENAME'] ?? '')) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode(['error' => 'Direct access forbidden']));
}

define("DB_SERVER", "129.121.85.208");
define("DB_USERNAME", "crmdmdev");
define("DB_PASSWORD", "m3M%wYMKu3+h");
define("DB_DATABASE", "db_rw");

class DbStatement {
    private mysqli_stmt $stmt;
    private $result = null;

    public function __construct(mysqli_stmt $stmt) {
        $this->stmt = $stmt;
    }

    public function execute(array $params = []): bool {
        $this->result = null;
        if ($params) {
            $values = array_map(fn($v) => is_bool($v) ? (int)$v : $v, array_values($params));
            $types = '';
            foreach ($values as $v) {
                $types .= is_int($v) ? 'i' : (is_float($v) ? 'd' : 's');
            }
            $this->stmt->bind_param($types, ...$values);
        }
        $ok = $this->stmt->execute();
        $res = $this->stmt->get_result();
        $this->result = $res ?: null;
        return $ok;
    }

    public function fetch() {
        if (!$this->result) return false;
        $row = $this->result->fetch_assoc();
        return $row ?: false;
    }

    public function fetchAll(): array {
        return $this->result ? $this->result->fetch_all(MYSQLI_ASSOC) : [];
    }

    public function fetchColumn() {
        if (!$this->result) return false;
        $row = $this->result->fetch_row();
        return $row ? $row[0] : false;
    }

    public function rowCount(): int {
        return (int)$this->stmt->affected_rows;
    }
}

class DbConnection {
    private mysqli $link;
    private bool $inTransaction = false;

    public function __construct(mysqli $link) {
        $this->link = $link;
    }

    public function prepare(string $sql): DbStatement {
        return new DbStatement($this->link->prepare($sql));
    }

    public function query(string $sql): DbStatement {
        $stmt = $this->prepare($sql);
        $stmt->execute();
        return $stmt;
    }

    public function exec(string $sql): int {
        $this->link->query($sql);
        return (int)$this->link->affected_rows;
    }

    public function lastInsertId(): string {
        return (string)$this->link->insert_id;
    }

    public function beginTransaction(): bool {
        $this->link->begin_transaction();
        return $this->inTransaction = true;
    }

    public function commit(): bool {
        $this->link->commit();
        $this->inTransaction = false;
        return true;
    }

    public function rollBack(): bool {
        $this->link->rollback();
        $this->inTransaction = false;
        return true;
    }

    public function inTransaction(): bool {
        return $this->inTransaction;
    }
}

function db(): DbConnection {
    static $conn = null;
    if ($conn) return $conn;
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    try {
        $link = mysqli_init();
        $link->options(MYSQLI_OPT_INT_AND_FLOAT_NATIVE, 1);
        $link->real_connect(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_DATABASE);
        $link->set_charset('utf8mb4');
    } catch (mysqli_sql_exception $e) {
        error_log('DB connection failed: ' . $e->getMessage());
        respond(['error' => 'Database connection failed'], 500);
    }
    return $conn = new DbConnection($link);
}