--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_update_zone_mappings stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_zone_mappings

DROP FUNCTION IF EXISTS base_pricing.fn_update_zone_mappings;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_zone_mappings(zone_mappings jsonb, batch_size integer DEFAULT 1000)
 RETURNS TABLE(product_id bigint, segment_id integer, updated boolean, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    json_data RECORD;
    update_count INTEGER := 0;
    target_exists BOOLEAN;
BEGIN
    -- Create temporary table to store results
    CREATE TEMP TABLE IF NOT EXISTS update_results (
        result_product_id BIGINT,
        result_segment_id INTEGER,
        result_updated BOOLEAN,
        result_message TEXT
    ) ON COMMIT DROP;

    -- Process each record individually
    FOR json_data IN SELECT * FROM jsonb_to_recordset(zone_mappings) AS x(
        product_id bigint,
        customer_segment_id integer,
        zone_structure_id integer
    )
    LOOP
        -- Check if the target record exists
        SELECT EXISTS (
            SELECT 1 FROM base_pricing.bp_product_customer_segment_prices t
            WHERE t.product_id = json_data.product_id
            AND t.segment_id = json_data.customer_segment_id
        ) INTO target_exists;

        IF target_exists THEN
            -- Record exists, perform update
            UPDATE base_pricing.bp_product_customer_segment_prices t
            SET 
                zone_structure_id = json_data.zone_structure_id,
                updated_at = CURRENT_TIMESTAMP
            WHERE t.product_id = json_data.product_id
            AND t.segment_id = json_data.customer_segment_id;
            
            INSERT INTO update_results VALUES (
                json_data.product_id, 
                json_data.customer_segment_id, 
                true, 
                'Successfully updated zone_structure_id'
            );
            update_count := update_count + 1;
        ELSE
            -- Record doesn't exist
            INSERT INTO update_results VALUES (
                json_data.product_id, 
                json_data.customer_segment_id, 
                false, 
                'No matching record found in bp_product_customer_segment_prices'
            );
        END IF;
    END LOOP;

    RAISE NOTICE 'Updated % records', update_count;
    
    -- Return all results
    RETURN QUERY 
        SELECT 
            result_product_id AS product_id,
            result_segment_id AS segment_id,
            result_updated AS updated,
            result_message AS message
        FROM update_results;
END;
$function$
;