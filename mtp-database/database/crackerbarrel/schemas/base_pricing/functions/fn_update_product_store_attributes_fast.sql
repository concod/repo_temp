--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_update_product_store_attributes_fast stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_product_store_attributes_fast

DROP FUNCTION IF EXISTS base_pricing.fn_update_product_store_attributes_fast;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_product_store_attributes_fast(updates_json jsonb, batch_size integer DEFAULT 1000)
 RETURNS TABLE(updated_count integer, total_input_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_input_count int;
BEGIN
    -- Get total input count
    total_input_count := jsonb_array_length(updates_json);
    
    -- Create temporary table for bulk processing
    CREATE TEMP TABLE temp_updates ON COMMIT DROP AS
    SELECT 
        (item->>'product_id')::int AS product_id,
        (item->>'store_id')::int AS store_id,
        (item->>'segment_id')::int AS segment_id,
        item->'attributes' AS update_attributes
    FROM jsonb_array_elements(updates_json) AS item;

    -- Create index on temp table
    CREATE INDEX idx_temp_updates ON temp_updates (product_id, store_id, segment_id);

    -- Perform bulk update using EXISTS (much faster)
    UPDATE base_pricing.bp_product_store_attributes_mapping AS target
    SET 
        attributes = temp.update_attributes,  -- Direct assignment if structure matches
        updated_at = CURRENT_TIMESTAMP
    FROM temp_updates temp
    WHERE target.product_id = temp.product_id
    AND target.store_id = temp.store_id
    AND target.segment_id = temp.segment_id;

    -- Get the count of updated rows
    updated_count := (SELECT COUNT(*) FROM temp_updates);
    
    RETURN QUERY SELECT updated_count, total_input_count;
END;
$function$
;