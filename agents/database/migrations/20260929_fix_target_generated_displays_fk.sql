BEGIN;

DO $$
DECLARE
    orphan_count bigint;
BEGIN
    SELECT count(*)
    INTO orphan_count
    FROM target_generated_displays display
    LEFT JOIN target_nodes node
        ON node.id = display.target_node_id
    WHERE node.id IS NULL;

    IF orphan_count > 0 THEN
        RAISE EXCEPTION
            'Cannot add target_node_id foreign key: % orphaned display rows',
            orphan_count;
    END IF;
END
$$;

ALTER TABLE target_generated_displays
    DROP CONSTRAINT IF EXISTS target_generated_displays_target_node_id_fkey;

ALTER TABLE target_generated_displays
    ADD CONSTRAINT target_generated_displays_target_node_id_fkey
    FOREIGN KEY (target_node_id)
    REFERENCES target_nodes(id);

COMMIT;
