CREATE TABLE IF NOT EXISTS api_router_dashboard_preferences (
    email VARCHAR(320) PRIMARY KEY,
    range_value VARCHAR(16) NOT NULL DEFAULT '7',
    granularity VARCHAR(32) NOT NULL DEFAULT 'day',
    updated_at VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS api_router_keys (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    name VARCHAR(255) NOT NULL,
    mask VARCHAR(64) NOT NULL,
    key_hash VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    quota VARCHAR(64) NOT NULL,
    used VARCHAR(64) NOT NULL DEFAULT '$0.00',
    last_used VARCHAR(40) NOT NULL DEFAULT '-',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    key_rpm INT NOT NULL DEFAULT 0,
    key_tpm BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_router_keys_email ON api_router_keys(email);
CREATE INDEX IF NOT EXISTS idx_api_router_keys_hash ON api_router_keys(key_hash);

CREATE TABLE IF NOT EXISTS api_router_usage_logs (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    key_id VARCHAR(64) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    key_mask VARCHAR(64) NOT NULL,
    model VARCHAR(255) NOT NULL,
    provider VARCHAR(64) NOT NULL DEFAULT '',
    channel_id VARCHAR(64) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    display_time VARCHAR(40) NOT NULL,
    status_code INT NOT NULL,
    success BOOLEAN NOT NULL,
    latency_ms BIGINT NOT NULL,
    input_tokens BIGINT NOT NULL,
    output_tokens BIGINT NOT NULL,
    total_tokens BIGINT NOT NULL,
    cost DECIMAL(18, 6) NOT NULL DEFAULT 0,
    error_message VARCHAR(512) NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_api_router_usage_email_time ON api_router_usage_logs(email, created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_usage_key_time ON api_router_usage_logs(key_id, created_at);

CREATE TABLE IF NOT EXISTS api_router_wallets (
    email VARCHAR(320) PRIMARY KEY,
    currency VARCHAR(16) NOT NULL DEFAULT 'USD',
    balance DECIMAL(18, 6) NOT NULL DEFAULT 0,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS api_router_ledger (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    key_id VARCHAR(64) NOT NULL DEFAULT '',
    usage_id VARCHAR(64) NOT NULL DEFAULT '',
    entry_type VARCHAR(64) NOT NULL,
    amount DECIMAL(18, 6) NOT NULL,
    balance_after DECIMAL(18, 6) NOT NULL,
    description VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_router_ledger_email_time ON api_router_ledger(email, created_at);

CREATE TABLE IF NOT EXISTS api_router_channels (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    base_url VARCHAR(1024) NOT NULL,
    api_key VARCHAR(2048) NOT NULL,
    models VARCHAR(2048) NOT NULL DEFAULT '*',
    priority INT NOT NULL DEFAULT 100,
    weight INT NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    retry_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    failure_count INT NOT NULL DEFAULT 0,
    last_status INT NOT NULL DEFAULT 0,
    last_error VARCHAR(512) NOT NULL DEFAULT '',
    circuit_state VARCHAR(32) NOT NULL DEFAULT 'CLOSED',
    circuit_disabled_until VARCHAR(40) NOT NULL DEFAULT '',
    last_checked_at VARCHAR(40) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

ALTER TABLE api_router_channels ADD COLUMN IF NOT EXISTS circuit_state VARCHAR(32) NOT NULL DEFAULT 'CLOSED';
ALTER TABLE api_router_channels ADD COLUMN IF NOT EXISTS circuit_disabled_until VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE api_router_channels ADD COLUMN IF NOT EXISTS last_checked_at VARCHAR(40) NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_api_router_channels_enabled ON api_router_channels(enabled, priority);
CREATE INDEX IF NOT EXISTS idx_api_router_channels_circuit ON api_router_channels(enabled, circuit_state, circuit_disabled_until);

CREATE TABLE IF NOT EXISTS api_router_model_prices (
    id VARCHAR(64) PRIMARY KEY,
    model_pattern VARCHAR(255) NOT NULL,
    provider VARCHAR(64) NOT NULL DEFAULT '*',
    channel_id VARCHAR(64) NOT NULL DEFAULT '*',
    input_price_per_million DECIMAL(18, 6) NOT NULL DEFAULT 0,
    output_price_per_million DECIMAL(18, 6) NOT NULL DEFAULT 0,
    priority INT NOT NULL DEFAULT 100,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    note VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_router_model_prices_match ON api_router_model_prices(enabled, priority, model_pattern);
CREATE INDEX IF NOT EXISTS idx_api_router_model_prices_provider ON api_router_model_prices(provider, channel_id);

CREATE TABLE IF NOT EXISTS api_router_redeem_codes (
    code VARCHAR(64) PRIMARY KEY,
    amount DECIMAL(18, 6) NOT NULL,
    max_uses INT NOT NULL DEFAULT 1,
    used_count INT NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at VARCHAR(40) NOT NULL DEFAULT '',
    note VARCHAR(512) NOT NULL DEFAULT '',
    created_by VARCHAR(320) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_router_redeem_codes_enabled ON api_router_redeem_codes(enabled, expires_at);

CREATE TABLE IF NOT EXISTS api_router_redeem_redemptions (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    email VARCHAR(320) NOT NULL,
    amount DECIMAL(18, 6) NOT NULL,
    created_at VARCHAR(40) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_router_redeem_once ON api_router_redeem_redemptions(code, email);
CREATE INDEX IF NOT EXISTS idx_api_router_redeem_email_time ON api_router_redeem_redemptions(email, created_at);

CREATE TABLE IF NOT EXISTS api_router_orders (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    amount DECIMAL(18, 6) NOT NULL,
    pay_method VARCHAR(64) NOT NULL DEFAULT 'manual',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    external_trade_no VARCHAR(128) NOT NULL DEFAULT '',
    idempotency_key VARCHAR(128) NOT NULL DEFAULT '',
    checkout_url VARCHAR(2048) NOT NULL DEFAULT '',
    qr_code_url VARCHAR(2048) NOT NULL DEFAULT '',
    payment_instructions VARCHAR(1024) NOT NULL DEFAULT '',
    payment_expires_at VARCHAR(40) NOT NULL DEFAULT '',
    payment_payload CLOB,
    note VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    paid_at VARCHAR(40) NOT NULL DEFAULT '',
    updated_at VARCHAR(40) NOT NULL
);

ALTER TABLE api_router_orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE api_router_orders ADD COLUMN IF NOT EXISTS checkout_url VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE api_router_orders ADD COLUMN IF NOT EXISTS qr_code_url VARCHAR(2048) NOT NULL DEFAULT '';
ALTER TABLE api_router_orders ADD COLUMN IF NOT EXISTS payment_instructions VARCHAR(1024) NOT NULL DEFAULT '';
ALTER TABLE api_router_orders ADD COLUMN IF NOT EXISTS payment_expires_at VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE api_router_orders ADD COLUMN IF NOT EXISTS payment_payload CLOB;

CREATE INDEX IF NOT EXISTS idx_api_router_orders_email_time ON api_router_orders(email, created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_orders_status ON api_router_orders(status, created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_orders_idempotency ON api_router_orders(email, idempotency_key);

CREATE TABLE IF NOT EXISTS api_router_payment_callbacks (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) NOT NULL,
    pay_method VARCHAR(64) NOT NULL,
    external_trade_no VARCHAR(128) NOT NULL DEFAULT '',
    amount DECIMAL(18, 6) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT '',
    nonce VARCHAR(128) NOT NULL DEFAULT '',
    signature VARCHAR(128) NOT NULL DEFAULT '',
    callback_key VARCHAR(256) NOT NULL DEFAULT '',
    payload VARCHAR(4096) NOT NULL DEFAULT '',
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    replay BOOLEAN NOT NULL DEFAULT FALSE,
    message VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);

ALTER TABLE api_router_payment_callbacks ADD COLUMN IF NOT EXISTS nonce VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE api_router_payment_callbacks ADD COLUMN IF NOT EXISTS signature VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE api_router_payment_callbacks ADD COLUMN IF NOT EXISTS callback_key VARCHAR(256) NOT NULL DEFAULT '';
ALTER TABLE api_router_payment_callbacks ADD COLUMN IF NOT EXISTS replay BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_api_router_payment_callbacks_order ON api_router_payment_callbacks(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_payment_callbacks_trade ON api_router_payment_callbacks(pay_method, external_trade_no);
CREATE INDEX IF NOT EXISTS idx_api_router_payment_callbacks_key ON api_router_payment_callbacks(callback_key, created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_payment_callbacks_replay ON api_router_payment_callbacks(replay, created_at);

CREATE TABLE IF NOT EXISTS api_router_payment_callback_nonces (
    callback_key VARCHAR(256) PRIMARY KEY,
    pay_method VARCHAR(64) NOT NULL,
    nonce VARCHAR(128) NOT NULL,
    order_id VARCHAR(64) NOT NULL DEFAULT '',
    external_trade_no VARCHAR(128) NOT NULL DEFAULT '',
    signature VARCHAR(128) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_router_callback_nonces_order ON api_router_payment_callback_nonces(order_id, created_at);

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

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_router_order_reconciliations_key ON api_router_order_reconciliations(issue_key);
CREATE INDEX IF NOT EXISTS idx_api_router_order_reconciliations_status ON api_router_order_reconciliations(resolved, severity, last_seen_at);
CREATE INDEX IF NOT EXISTS idx_api_router_order_reconciliations_order ON api_router_order_reconciliations(order_id, last_seen_at);

CREATE TABLE IF NOT EXISTS api_router_admin_audits (
    id VARCHAR(64) PRIMARY KEY,
    operator_email VARCHAR(320) NOT NULL,
    action VARCHAR(96) NOT NULL,
    target_type VARCHAR(64) NOT NULL DEFAULT '',
    target_id VARCHAR(128) NOT NULL DEFAULT '',
    target_email VARCHAR(320) NOT NULL DEFAULT '',
    detail VARCHAR(1024) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_router_admin_audits_time ON api_router_admin_audits(created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_admin_audits_operator ON api_router_admin_audits(operator_email, created_at);
CREATE INDEX IF NOT EXISTS idx_api_router_admin_audits_target ON api_router_admin_audits(target_type, target_id, created_at);

CREATE TABLE IF NOT EXISTS api_router_user_controls (
    email VARCHAR(320) PRIMARY KEY,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    frozen BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(512) NOT NULL DEFAULT '',
    updated_by VARCHAR(320) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_api_router_user_controls_status ON api_router_user_controls(status, updated_at);
CREATE INDEX IF NOT EXISTS idx_api_router_user_controls_frozen ON api_router_user_controls(frozen, updated_at);

CREATE TABLE IF NOT EXISTS agent_runs (
    email VARCHAR(320) NOT NULL,
    run_id VARCHAR(96) NOT NULL,
    chat_id VARCHAR(96) NOT NULL DEFAULT '',
    message_index INT,
    source VARCHAR(64) NOT NULL DEFAULT 'runtime',
    saved_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    contract_version VARCHAR(64) NOT NULL DEFAULT 'agent-contract-v1',
    mode VARCHAR(32) NOT NULL DEFAULT '',
    research_profile VARCHAR(32) NOT NULL DEFAULT '',
    snapshot_json CLOB NOT NULL,
    PRIMARY KEY(email, run_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_email_updated ON agent_runs(email, updated_at);
CREATE INDEX IF NOT EXISTS idx_agent_runs_email_chat ON agent_runs(email, chat_id, updated_at);

CREATE TABLE IF NOT EXISTS agent_run_events (
    email VARCHAR(320) NOT NULL,
    run_id VARCHAR(96) NOT NULL,
    seq INT NOT NULL,
    event_id VARCHAR(96) NOT NULL,
    event_type VARCHAR(96) NOT NULL,
    stage VARCHAR(64) NOT NULL DEFAULT '',
    visibility VARCHAR(32) NOT NULL DEFAULT 'history',
    ts VARCHAR(40) NOT NULL,
    payload_json CLOB NOT NULL,
    event_json CLOB NOT NULL,
    PRIMARY KEY(email, run_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_agent_run_events_run_ts ON agent_run_events(email, run_id, ts);
CREATE INDEX IF NOT EXISTS idx_agent_run_events_type ON agent_run_events(email, event_type, ts);
