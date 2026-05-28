CREATE TABLE IF NOT EXISTS api_router_user_controls (
    email VARCHAR(320) PRIMARY KEY,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
    frozen BOOLEAN NOT NULL DEFAULT FALSE,
    reason VARCHAR(512) NOT NULL DEFAULT '',
    updated_by VARCHAR(320) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX idx_api_router_user_controls_status ON api_router_user_controls(status, updated_at);
CREATE INDEX idx_api_router_user_controls_frozen ON api_router_user_controls(frozen, updated_at);
