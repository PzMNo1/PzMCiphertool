ALTER TABLE agent_recharge_credits ADD COLUMN IF NOT EXISTS agentmaster_credits INT NOT NULL DEFAULT 0;
ALTER TABLE agent_recharge_ledger ADD COLUMN IF NOT EXISTS agentmaster_delta INT NOT NULL DEFAULT 0;
