--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_update_product_store_attributes_bulk stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_update_product_store_attributes_bulk

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_product_store_attributes_bulk(jsonb);

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_product_store_attributes_bulk(updates_json jsonb)
 RETURNS TABLE(updated_count integer, total_input_count integer)
 LANGUAGE plpgsql
  SECURITY DEFINER
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

    -- Perform bulk update
    WITH updated AS (
        UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping AS target
        SET 
            attributes = (
                SELECT jsonb_agg(
                    CASE WHEN u.attr_key IS NOT NULL THEN
                        jsonb_set(
                            elem,
                            '{attribute_value,current}',
                            u.attr_value
                        )
                    ELSE elem
                    END
                )
                FROM jsonb_array_elements(target.attributes) AS elem
                LEFT JOIN LATERAL (
                    SELECT key as attr_key, value as attr_value
                    FROM jsonb_each(temp.update_attributes)
                    WHERE key = elem->>'attribute_name'
                ) AS u ON true
            ),
            updated_at = CURRENT_TIMESTAMP
        FROM temp_updates temp
        WHERE target.product_id = temp.product_id
        AND target.store_id = temp.store_id
        AND target.segment_id = temp.segment_id
        RETURNING 1
    )
    SELECT COUNT(*) INTO updated_count FROM updated;
    
    RETURN QUERY SELECT updated_count, total_input_count;
END;
$function$
;