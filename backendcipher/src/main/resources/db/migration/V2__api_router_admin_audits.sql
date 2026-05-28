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

CREATE INDEX idx_api_router_admin_audits_time ON api_router_admin_audits(created_at);
CREATE INDEX idx_api_router_admin_audits_operator ON api_router_admin_audits(operator_email, created_at);
CREATE INDEX idx_api_router_admin_audits_target ON api_router_admin_audits(target_type, target_id, created_at);
