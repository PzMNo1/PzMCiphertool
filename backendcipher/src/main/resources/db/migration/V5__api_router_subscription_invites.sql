CREATE TABLE IF NOT EXISTS api_router_subscription_plans (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(18, 6) NOT NULL DEFAULT 0,
    credit DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quota VARCHAR(128) NOT NULL DEFAULT '',
    badge VARCHAR(64) NOT NULL DEFAULT '',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 100,
    note VARCHAR(512) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX idx_api_router_subscription_plans_enabled ON api_router_subscription_plans(enabled, priority);

CREATE TABLE IF NOT EXISTS api_router_invite_profiles (
    email VARCHAR(320) PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL
);

CREATE INDEX idx_api_router_invite_profiles_code ON api_router_invite_profiles(code);

CREATE TABLE IF NOT EXISTS api_router_invite_referrals (
    id VARCHAR(64) PRIMARY KEY,
    inviter_email VARCHAR(320) NOT NULL,
    invitee_email VARCHAR(320) NOT NULL,
    code VARCHAR(64) NOT NULL,
    reward_amount DECIMAL(18, 6) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    created_at VARCHAR(40) NOT NULL,
    rewarded_at VARCHAR(40) NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX idx_api_router_invite_once ON api_router_invite_referrals(invitee_email);
CREATE INDEX idx_api_router_invite_inviter ON api_router_invite_referrals(inviter_email, created_at);
CREATE INDEX idx_api_router_invite_code ON api_router_invite_referrals(code, created_at);
