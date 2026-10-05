ALTER TABLE targets
    ALTER COLUMN user_id TYPE VARCHAR(64)
    USING user_id::text;

CREATE INDEX IF NOT EXISTS ix_targets_user_id
    ON targets (user_id);

CREATE INDEX IF NOT EXISTS ix_targets_user_recent
    ON targets (user_id, status, update_time DESC);
