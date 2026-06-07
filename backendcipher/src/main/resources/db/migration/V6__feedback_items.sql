CREATE TABLE IF NOT EXISTS feedback_items (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    content CLOB NOT NULL,
    reply_content CLOB,
    reply_email VARCHAR(320) NOT NULL DEFAULT '',
    created_at VARCHAR(40) NOT NULL,
    updated_at VARCHAR(40) NOT NULL,
    replied_at VARCHAR(40) NOT NULL DEFAULT ''
);

CREATE INDEX idx_feedback_items_created_at ON feedback_items(created_at);
CREATE INDEX idx_feedback_items_email_time ON feedback_items(email, created_at);
