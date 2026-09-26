--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:fn_update_competitor_mappings_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_update_competitor_mappings_v1

DROP FUNCTION IF EXISTS base_pricing.fn_update_competitor_mappings(jsonb, integer);

CREATE OR REPLACE FUNCTION base_pricing.fn_update_competitor_mappings(competitor_mappings jsonb, batch_size integer DEFAULT 1000)
 RETURNS TABLE(product_id bigint, channel_id integer, zone_structure text, price_zone text, updated boolean, message text)
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
        result_channel_id INTEGER,
        result_zone_structure TEXT,
        result_price_zone TEXT,
        result_updated BOOLEAN,
        result_message TEXT
    ) ON COMMIT DROP;

    -- Process each record individually
    FOR json_data IN SELECT * FROM jsonb_to_recordset(competitor_mappings) AS x(
        product_id bigint,
        channel_id integer,
        zone_structure text,
        price_zone text,
        primary_bucket text[],
        primary_mode text,
        secondary_bucket text[],
        secondary_mode text,
        tertiary_bucket text[],
        tertiary_mode text,
        quaternary_bucket text[],
        quaternary_mode text
    )
    LOOP
        -- Check if the target record exists using explicit table reference
        SELECT EXISTS (
            SELECT 1 FROM base_pricing.bp_product_store_attributes_mapping t
            WHERE t.product_id = json_data.product_id
            AND t.channel_id = json_data.channel_id
            AND t.zone_structure = json_data.zone_structure
            AND t.price_zone = json_data.price_zone
        ) INTO target_exists;

        IF target_exists THEN
            -- Record exists, perform update with explicit table references
            -- This version will set fields to NULL when NULL is provided in payload
            UPDATE base_pricing.bp_product_store_attributes_mapping t
            SET 
                updated_at = CURRENT_TIMESTAMP,
                primary_bucket = CASE WHEN jsonb_typeof(competitor_mappings->0->'primary_bucket') IS NOT NULL 
                                      THEN json_data.primary_bucket ELSE t.primary_bucket END,
                primary_mode = CASE WHEN jsonb_typeof(competitor_mappings->0->'primary_mode') IS NOT NULL 
                                    THEN json_data.primary_mode ELSE t.primary_mode END,
                secondary_bucket = CASE WHEN jsonb_typeof(competitor_mappings->0->'secondary_bucket') IS NOT NULL 
                                        THEN json_data.secondary_bucket ELSE t.secondary_bucket END,
                secondary_mode = CASE WHEN jsonb_typeof(competitor_mappings->0->'secondary_mode') IS NOT NULL 
                                      THEN json_data.secondary_mode ELSE t.secondary_mode END,
                tertiary_bucket = CASE WHEN jsonb_typeof(competitor_mappings->0->'tertiary_bucket') IS NOT NULL 
                                      THEN json_data.tertiary_bucket ELSE t.tertiary_bucket END,
                tertiary_mode = CASE WHEN jsonb_typeof(competitor_mappings->0->'tertiary_mode') IS NOT NULL 
                                     THEN json_data.tertiary_mode ELSE t.tertiary_mode END,
                quaternary_bucket = CASE WHEN jsonb_typeof(competitor_mappings->0->'quaternary_bucket') IS NOT NULL 
                                        THEN json_data.quaternary_bucket ELSE t.quaternary_bucket END,
                quaternary_mode = CASE WHEN jsonb_typeof(competitor_mappings->0->'quaternary_mode') IS NOT NULL 
                                       THEN json_data.quaternary_mode ELSE t.quaternary_mode END
            WHERE t.product_id = json_data.product_id
            AND t.channel_id = json_data.channel_id
            AND t.zone_structure = json_data.zone_structure
            AND t.price_zone = json_data.price_zone
            AND segment_id = 10001;
            
            INSERT INTO update_results VALUES (
                json_data.product_id, 
                json_data.channel_id, 
                json_data.zone_structure, 
                json_data.price_zone, 
                true, 
                'Successfully updated'
            );
            update_count := update_count + 1;
        ELSE
            -- Record doesn't exist
            INSERT INTO update_results VALUES (
                json_data.product_id, 
                json_data.channel_id, 
                json_data.zone_structure, 
                json_data.price_zone, 
                false, 
                'No matching record found'
            );
        END IF;
    END LOOP;

    RAISE NOTICE 'Updated % records', update_count;
    
    -- Return all results
    RETURN QUERY 
        SELECT 
            result_product_id AS product_id,
            result_channel_id AS channel_id,
            result_zone_structure AS zone_structure,
            result_price_zone AS price_zone,
            result_updated AS updated,
            result_message AS message
        FROM update_results;
END;
$function$
;
