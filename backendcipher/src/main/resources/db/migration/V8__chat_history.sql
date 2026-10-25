CREATE TABLE IF NOT EXISTS chat_history (
    account VARCHAR(320) PRIMARY KEY,
    history_json CLOB NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);
