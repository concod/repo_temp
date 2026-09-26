--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:fn_update_competitor_mappings_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_update_competitor_mappings_2

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_competitor_mappings;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_competitor_mappings(competitor_mappings jsonb, batch_size integer DEFAULT 1000)
 RETURNS TABLE(product_id bigint, channel_id integer, zone_structure text, price_zone text, updated boolean, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    json_element jsonb;
    update_count INTEGER := 0;
    rows_updated INTEGER := 0;
    p_product_id bigint;
    p_channel_id integer;
    p_zone_structure text;
    p_price_zone text;
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

    -- Process each JSON element
    FOR json_element IN SELECT * FROM jsonb_array_elements(competitor_mappings)
    LOOP
        -- Extract basic fields
        p_product_id := (json_element ->> 'product_id')::bigint;
        p_channel_id := (json_element ->> 'channel_id')::integer;
        p_zone_structure := json_element ->> 'zone_structure';
        p_price_zone := json_element ->> 'price_zone';
        
        -- First, get the count of existing rows
        SELECT COUNT(*) INTO rows_updated
        FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 t
        WHERE t.product_id = p_product_id 
          AND t.channel_id = p_channel_id 
          AND t.zone_structure IS NOT DISTINCT FROM p_zone_structure
          AND t.price_zone IS NOT DISTINCT FROM p_price_zone
          AND t.segment_id = 10001;
        
        IF rows_updated > 0 THEN
            -- Update ALL matching rows (handles duplicates)
            UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping_v4 t
            SET 
                updated_at = CURRENT_TIMESTAMP,
                primary_bucket = CASE 
                    WHEN json_element ? 'primary_bucket' 
                    THEN CASE 
                        WHEN json_element -> 'primary_bucket' IS NOT NULL 
                        AND jsonb_typeof(json_element -> 'primary_bucket') != 'null'
                        THEN ARRAY(SELECT jsonb_array_elements_text(json_element -> 'primary_bucket'))
                        ELSE NULL  -- Explicitly set to NULL if key exists with null value
                    END
                    ELSE t.primary_bucket 
                END,
                primary_mode = CASE 
                    WHEN json_element ? 'primary_mode' 
                    THEN (json_element ->> 'primary_mode')  -- This will be NULL for JSON null
                    ELSE t.primary_mode 
                END,
                secondary_bucket = CASE 
                    WHEN json_element ? 'secondary_bucket'
                    THEN CASE 
                        WHEN json_element -> 'secondary_bucket' IS NOT NULL 
                        AND jsonb_typeof(json_element -> 'secondary_bucket') != 'null'
                        THEN ARRAY(SELECT jsonb_array_elements_text(json_element -> 'secondary_bucket'))
                        ELSE NULL  -- Explicitly set to NULL if key exists with null value
                    END
                    ELSE t.secondary_bucket 
                END,
                secondary_mode = CASE 
                    WHEN json_element ? 'secondary_mode'
                    THEN (json_element ->> 'secondary_mode')  -- This will be NULL for JSON null
                    ELSE t.secondary_mode 
                END,
                tertiary_bucket = CASE 
                    WHEN json_element ? 'tertiary_bucket'
                    THEN CASE 
                        WHEN json_element -> 'tertiary_bucket' IS NOT NULL 
                        AND jsonb_typeof(json_element -> 'tertiary_bucket') != 'null'
                        THEN ARRAY(SELECT jsonb_array_elements_text(json_element -> 'tertiary_bucket'))
                        ELSE NULL  -- Explicitly set to NULL if key exists with null value
                    END
                    ELSE t.tertiary_bucket 
                END,
                tertiary_mode = CASE 
                    WHEN json_element ? 'tertiary_mode'
                    THEN (json_element ->> 'tertiary_mode')  -- This will be NULL for JSON null
                    ELSE t.tertiary_mode 
                END,
                quaternary_bucket = CASE 
                    WHEN json_element ? 'quaternary_bucket'
                    THEN CASE 
                        WHEN json_element -> 'quaternary_bucket' IS NOT NULL 
                        AND jsonb_typeof(json_element -> 'quaternary_bucket') != 'null'
                        THEN ARRAY(SELECT jsonb_array_elements_text(json_element -> 'quaternary_bucket'))
                        ELSE NULL  -- Explicitly set to NULL if key exists with null value
                    END
                    ELSE t.quaternary_bucket 
                END,
                quaternary_mode = CASE 
                    WHEN json_element ? 'quaternary_mode'
                    THEN (json_element ->> 'quaternary_mode')  -- This will be NULL for JSON null
                    ELSE t.quaternary_mode 
                END
            WHERE 
                t.product_id = p_product_id 
                AND t.channel_id = p_channel_id 
                AND t.zone_structure IS NOT DISTINCT FROM p_zone_structure
                AND t.price_zone IS NOT DISTINCT FROM p_price_zone
                AND t.segment_id = 10001;
            
            -- Get the actual number of rows updated
            GET DIAGNOSTICS rows_updated = ROW_COUNT;
            
            INSERT INTO update_results VALUES (
                p_product_id, p_channel_id, p_zone_structure, p_price_zone, 
                true, 'Successfully updated ' || rows_updated || ' rows'
            );
            update_count := update_count + rows_updated;
        ELSE
            INSERT INTO update_results VALUES (
                p_product_id, p_channel_id, p_zone_structure, p_price_zone, 
                false, 'No matching record found'
            );
        END IF;
    END LOOP;

    RAISE NOTICE 'Updated % total rows', update_count;
    
    RETURN QUERY 
        SELECT result_product_id, result_channel_id, result_zone_structure, 
               result_price_zone, result_updated, result_message
        FROM update_results;
END;
$function$
;