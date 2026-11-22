CREATE TABLE IF NOT EXISTS agent_recharge_orders (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    plan_name VARCHAR(120) NOT NULL,
    amount DECIMAL(18, 6) NOT NULL,
    pay_method VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    external_trade_no VARCHAR(255) NOT NULL DEFAULT '',
    idempotency_key VARCHAR(128) NOT NULL DEFAULT '',
    checkout_url VARCHAR(2048) NOT NULL DEFAULT '',
    qr_code_url VARCHAR(2048) NOT NULL DEFAULT '',
    payment_instructions VARCHAR(2048) NOT NULL DEFAULT '',
    payment_expires_at VARCHAR(40) NOT NULL DEFAULT '',
    payment_payload VARCHAR(2048) NOT NULL DEFAULT '',
    note VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    paid_at VARCHAR(40) NOT NULL DEFAULT '',
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX idx_agent_recharge_orders_email_time ON agent_recharge_orders(email, created_at);
CREATE INDEX idx_agent_recharge_orders_status ON agent_recharge_orders(status, created_at);
CREATE INDEX idx_agent_recharge_orders_idem ON agent_recharge_orders(email, idempotency_key);

CREATE TABLE IF NOT EXISTS agent_recharge_credits (
    email VARCHAR(320) PRIMARY KEY,
    agent_credits INT NOT NULL DEFAULT 0,
    image_credits INT NOT NULL DEFAULT 0,
    video_credits INT NOT NULL DEFAULT 0,
    updated_at VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS agent_recharge_ledger (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    entry_type VARCHAR(64) NOT NULL,
    agent_delta INT NOT NULL DEFAULT 0,
    image_delta INT NOT NULL DEFAULT 0,
    video_delta INT NOT NULL DEFAULT 0,
    note VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);

CREATE INDEX idx_agent_recharge_ledger_email_time ON agent_recharge_ledger(email, created_at);
CREATE UNIQUE INDEX idx_agent_recharge_ledger_order ON agent_recharge_ledger(order_id, entry_type);

CREATE TABLE IF NOT EXISTS agent_recharge_callback_nonces (
    callback_key VARCHAR(256) PRIMARY KEY,
    nonce VARCHAR(128) NOT NULL,
    pay_method VARCHAR(32) NOT NULL DEFAULT '',
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    external_trade_no VARCHAR(255) NOT NULL DEFAULT '',
    signature VARCHAR(128) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);
