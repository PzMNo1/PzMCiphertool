ALTER TABLE api_router_payment_callbacks ADD COLUMN nonce VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE api_router_payment_callbacks ADD COLUMN signature VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE api_router_payment_callbacks ADD COLUMN callback_key VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE api_router_payment_callbacks ADD COLUMN replay BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_api_router_payment_callbacks_key ON api_router_payment_callbacks(callback_key, created_at);
CREATE INDEX idx_api_router_payment_callbacks_replay ON api_router_payment_callbacks(replay, created_at);

CREATE TABLE IF NOT EXISTS api_router_payment_callback_nonces (
    callback_key VARCHAR(256) PRIMARY KEY,
    pay_method VARCHAR(64) NOT NULL,
    nonce VARCHAR(128) NOT NULL,
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    external_trade_no VARCHAR(128) NOT NULL DEFAULT '',
    signature VARCHAR(128) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);

CREATE INDEX idx_api_router_callback_nonces_order ON api_router_payment_callback_nonces(order_id, created_at);

CREATE TABLE IF NOT EXISTS api_router_order_reconciliations (
    id VARCHAR(64) PRIMARY KEY,
    issue_key VARCHAR(256) NOT NULL,
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    email VARCHAR(320) NOT NULL DEFAULT '',
    pay_method VARCHAR(64) NOT NULL DEFAULT '',
    order_status VARCHAR(32) NOT NULL DEFAULT '',
    order_amount DECIMAL(18, 6) NOT NULL DEFAULT 0,
    callback_amount DECIMAL(18, 6) NOT NULL DEFAULT 0,
    external_trade_no VARCHAR(128) NOT NULL DEFAULT '',
    issue_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'WARN',
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    message VARCHAR(1024) NOT NULL DEFAULT '',
    first_seen_at VARCHAR(40) NOT NULL,
    last_seen_at VARCHAR(40) NOT NULL,
    resolved_at VARCHAR(40) NOT NULL DEFAULT '',
    resolved_by VARCHAR(320) NOT NULL DEFAULT '',
    resolve_note VARCHAR(512) NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX idx_api_router_order_reconciliations_key ON api_router_order_reconciliations(issue_key);
CREATE INDEX idx_api_router_order_reconciliations_status ON api_router_order_reconciliations(resolved, severity, last_seen_at);
CREATE INDEX idx_api_router_order_reconciliations_order ON api_router_order_reconciliations(order_id, last_seen_at);
