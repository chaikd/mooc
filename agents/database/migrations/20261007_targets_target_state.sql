BEGIN;

DO $$
BEGIN
    CREATE TYPE target_state AS ENUM (
        'Node_DISCOVERY',
        'LEARNING',
        'EVALUATE_FEEDBACK'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE targets
    ADD COLUMN IF NOT EXISTS target_state target_state;

UPDATE targets
SET target_state = CASE
    WHEN current_node_id IS NOT NULL THEN 'LEARNING'::target_state
    ELSE 'Node_DISCOVERY'::target_state
END
WHERE target_state IS NULL;

ALTER TABLE targets
    ALTER COLUMN target_state SET DEFAULT 'Node_DISCOVERY'::target_state;

ALTER TABLE targets
    ALTER COLUMN target_state SET NOT NULL;

COMMIT;
