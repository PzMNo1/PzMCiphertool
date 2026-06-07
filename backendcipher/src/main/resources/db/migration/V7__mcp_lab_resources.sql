CREATE TABLE IF NOT EXISTS mcp_lab_resources (
    id VARCHAR(96) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    category VARCHAR(32) NOT NULL,
    categories_json VARCHAR(512) NOT NULL DEFAULT '[]',
    source VARCHAR(32) NOT NULL,
    risk VARCHAR(32) NOT NULL,
    recommend VARCHAR(120) NOT NULL DEFAULT '',
    tags_json VARCHAR(1024) NOT NULL DEFAULT '[]',
    scenario CLOB NOT NULL,
    url VARCHAR(2048) NOT NULL,
    docs VARCHAR(2048) NOT NULL DEFAULT '',
    template CLOB NOT NULL,
    platforms_json VARCHAR(1024) NOT NULL DEFAULT '[]',
    permissions_json VARCHAR(1024) NOT NULL DEFAULT '[]',
    install_modes_json VARCHAR(1024) NOT NULL DEFAULT '[]',
    auth_required VARCHAR(16) NOT NULL DEFAULT 'depends',
    maintenance VARCHAR(32) NOT NULL DEFAULT 'unknown',
    trust_score INT NOT NULL DEFAULT 60,
    last_checked VARCHAR(32) NOT NULL DEFAULT '',
    origin VARCHAR(32) NOT NULL DEFAULT 'community',
    submitted_by VARCHAR(320) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    deleted BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_mcp_lab_resources_category ON mcp_lab_resources(category, trust_score);
CREATE INDEX IF NOT EXISTS idx_mcp_lab_resources_origin ON mcp_lab_resources(origin, created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_lab_resources_deleted ON mcp_lab_resources(deleted, updated_at);
