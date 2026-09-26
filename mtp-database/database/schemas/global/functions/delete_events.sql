--liquibase formatted sql
--changeset liquibase:delete_events,modified runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for delete_events, modified by Abhishek Jha
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.delete_events(event_ids integer[], created_by integer);
CREATE OR REPLACE FUNCTION global.delete_events(event_ids integer[], created_by integer)
 RETURNS TABLE(affected_ids integer[], affected_components jsonb)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Step 1: Delete from metadata and collect event IDs
    WITH affected AS (
        UPDATE global.notes_event_metadata AS nem
        SET is_deleted = TRUE
        WHERE nem.event_id = ANY($1)
          AND nem.created_by = $2
        RETURNING nem.event_id
    )
    SELECT COALESCE(array_agg(DISTINCT event_id), ARRAY[]::integer[])
    INTO affected_ids
    FROM affected;

    -- Step 2: Delete corresponding notes
    UPDATE global.notes_master AS nm
    SET is_deleted = TRUE
    WHERE nm.event_id = ANY(affected_ids);

    -- Step 3: Collect component info
    SELECT COALESCE(
        JSON_AGG(row_to_json(t)),
        '[]'::json
    )
    INTO affected_components
    FROM (
        SELECT 
            ncem.component_id,
            ncem.sub_component::jsonb->>'sub_component_id' AS sub_component_id,
            COUNT(*) AS deleted_events_count
        FROM global.notes_component_event_mapping ncem
        WHERE ncem.event_id = ANY(affected_ids)
        GROUP BY ncem.component_id, (ncem.sub_component::jsonb->>'sub_component_id')
    ) t;

    -- Step 4: Log for debugging
    RAISE NOTICE 'Deleted events: %, affected_components: %', affected_ids, affected_components;

    -- Step 5: Return
    RETURN QUERY SELECT affected_ids, affected_components;
END;
$function$
;
