--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_update_competitor_mappings_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_update_competitor_mappings_10

DROP FUNCTION IF EXISTS base_pricing.fn_update_competitor_mappings;

CREATE OR REPLACE FUNCTION base_pricing.fn_update_competitor_mappings(competitor_mappings jsonb, batch_size integer DEFAULT 1000)
 RETURNS TABLE(product_id bigint, channel_id integer, zone_structure text, price_zone text, updated boolean, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    json_data RECORD;
    update_count INTEGER := 0;
    target_exists BOOLEAN;
    where_conditions TEXT;
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
        -- Build dynamic WHERE conditions based on non-null values
        where_conditions := 'product_id = ' || json_data.product_id || 
                           ' AND channel_id = ' || json_data.channel_id;
        
        IF json_data.zone_structure IS NOT NULL THEN
            where_conditions := where_conditions || ' AND zone_structure = ' || quote_literal(json_data.zone_structure);
        ELSE
            where_conditions := where_conditions || ' AND zone_structure IS NULL';
        END IF;
        
        IF json_data.price_zone IS NOT NULL THEN
            where_conditions := where_conditions || ' AND price_zone = ' || quote_literal(json_data.price_zone);
        ELSE
            where_conditions := where_conditions || ' AND price_zone IS NULL';
        END IF;
        
        where_conditions := where_conditions || ' AND segment_id = 10001';

        -- Check if the target record exists using dynamic query
        EXECUTE 'SELECT EXISTS (
            SELECT 1 FROM base_pricing.bp_product_store_attributes_mapping_v4 t
            WHERE ' || where_conditions || '
        )' INTO target_exists;

        IF target_exists THEN
            -- Record exists, perform update with dynamic WHERE clause
            EXECUTE '
                UPDATE base_pricing.bp_product_store_attributes_mapping_v4 t
                SET 
                    updated_at = CURRENT_TIMESTAMP,
                    primary_bucket = COALESCE($1, primary_bucket),
                    primary_mode = COALESCE($2, primary_mode),
                    secondary_bucket = COALESCE($3, secondary_bucket),
                    secondary_mode = COALESCE($4, secondary_mode),
                    tertiary_bucket = COALESCE($5, tertiary_bucket),
                    tertiary_mode = COALESCE($6, tertiary_mode),
                    quaternary_bucket = COALESCE($7, quaternary_bucket),
                    quaternary_mode = COALESCE($8, quaternary_mode)
                WHERE ' || where_conditions
            USING 
                json_data.primary_bucket,
                json_data.primary_mode,
                json_data.secondary_bucket,
                json_data.secondary_mode,
                json_data.tertiary_bucket,
                json_data.tertiary_mode,
                json_data.quaternary_bucket,
                json_data.quaternary_mode;
            
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