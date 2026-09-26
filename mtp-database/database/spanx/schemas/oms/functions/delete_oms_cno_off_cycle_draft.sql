--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:delete_oms_cno_off_cycle_draft_update5 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-93604
--comment: Bulk delete off-cycle order draft data update5 - convert text[] to integer[] for comparison
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.delete_oms_cno_off_cycle_draft(draft_ids text[], user_id integer);
CREATE OR REPLACE FUNCTION inventory_smart.delete_oms_cno_off_cycle_draft(draft_ids text[], user_id integer)
RETURNS TABLE( deleted_count integer, message text)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_deleted_count integer;
    v_draft_ids_int integer[];
BEGIN
    -- Convert text array to integer array
    v_draft_ids_int := ARRAY(SELECT unnest(draft_ids)::integer);

    -- Soft delete records from oms_cno_off_cycle_draft table
    -- Set is_deleted = true and update deleted_at, deleted_by fields
    UPDATE inventory_smart.oms_cno_off_cycle_draft
    SET 
        updated_at = CURRENT_TIMESTAMP,
        updated_by = user_id,
        is_deleted = true
    WHERE 
        draft_id = ANY(v_draft_ids_int)
        AND (is_deleted IS NULL OR is_deleted = false);

    -- Get the number of affected rows
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Return the result
    RETURN QUERY SELECT 
        v_deleted_count,
        format('Successfully soft deleted %s draft(s) with ID(s): %s', v_deleted_count, array_to_string(draft_ids, ', '))::text;

EXCEPTION
    WHEN OTHERS THEN
        -- Return error information
        RETURN QUERY SELECT 
            0::integer,
            format('Error deleting drafts: %s', SQLERRM)::text;
END;
$function$;