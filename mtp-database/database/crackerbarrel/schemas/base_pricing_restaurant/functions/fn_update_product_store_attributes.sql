--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:fn_update_product_store_attributes_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_update_product_store_attributes_2

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_update_product_store_attributes;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_update_product_store_attributes(updates_json jsonb, attribute_update_level text DEFAULT 'product-store-segment'::text)
 RETURNS TABLE(updated_count integer, total_input_count integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    input_count int;
    affected_count int;
    update_start_time timestamp;
    update_end_time timestamp;
    
    -- Variables for processing
    target_record record;
    channel_config_record record;
    cost_components jsonb;
    calculated_value numeric;
    formula text;
    recalc_attrs text[] := '{}';
    attr_name text;
    base_attr_record record;
    impact_record record;
    
    -- Dynamic impact mapping
    base_attribute text;
    impacted_attrs text[];
    attributes_json jsonb;
BEGIN
    update_start_time := clock_timestamp();
    input_count := jsonb_array_length(updates_json);
    RAISE NOTICE 'Processing % input records at level: %', input_count, attribute_update_level;

    -- Create temporary table for updates
    CREATE TEMPORARY TABLE temp_updates ON COMMIT DROP AS
    SELECT 
        (item->>'product_id')::int AS product_id,
        (item->>'store_id')::int AS store_id,
        (item->>'segment_id')::int AS segment_id,
        item - 'product_id' - 'store_id' - 'segment_id' AS attributes_to_update
    FROM jsonb_array_elements(updates_json) AS item;

    -- Create temporary table for target records
    CREATE TEMPORARY TABLE temp_target_records ON COMMIT DROP AS
    SELECT 
        target.*,
        upd.attributes_to_update
    FROM base_pricing_restaurant.bp_product_store_attributes_mapping_v4 target
    JOIN temp_updates upd ON (
        target.product_id = upd.product_id AND
        CASE attribute_update_level
            WHEN 'product' THEN true
            WHEN 'product-store' THEN (upd.store_id IS NULL OR target.store_id = upd.store_id)
            WHEN 'product-segment' THEN (upd.segment_id IS NULL OR target.segment_id = upd.segment_id)
            ELSE (upd.store_id IS NULL OR target.store_id = upd.store_id) 
                 AND (upd.segment_id IS NULL OR target.segment_id = upd.segment_id)
        END
    );

    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RAISE NOTICE 'Found % target records to update', affected_count;

    -- If no records found
    IF affected_count = 0 THEN
        DROP TABLE temp_updates;
        DROP TABLE temp_target_records;
        RETURN QUERY SELECT 0, input_count;
        RETURN;
    END IF;

    -- Process each target record
    affected_count := 0;
    FOR target_record IN 
        SELECT * FROM temp_target_records
    LOOP
        -- Step 1: DYNAMIC IMPACT DETECTION - Read from bp_product_attributes_metadata
        recalc_attrs := '{}';
        
        -- For each base attribute being updated, get impacted attributes from metadata
        FOR impact_record IN 
            SELECT 
                pam.attribute_name,
                pam.product_store_impacted_attributes
            FROM jsonb_object_keys(target_record.attributes_to_update) AS updated_attr(key)
            JOIN base_pricing_restaurant.bp_product_attributes_metadata pam ON pam.attribute_name = updated_attr.key
            WHERE pam.product_store_impacted_attributes IS NOT NULL
        LOOP
            -- Since product_store_impacted_attributes is already a text array, use it directly
            impacted_attrs := impact_record.product_store_impacted_attributes;
            
            recalc_attrs := recalc_attrs || impacted_attrs;
            RAISE NOTICE 'Base attribute % changes impact: %', impact_record.attribute_name, impacted_attrs;
        END LOOP;
        
        -- Remove duplicates
        SELECT ARRAY(SELECT DISTINCT unnest(recalc_attrs)) INTO recalc_attrs;
        
        RAISE NOTICE 'Product: %, Store: %, Segment: %, Channel: %, Recalc attributes: %', 
            target_record.product_id, target_record.store_id, 
            target_record.segment_id, target_record.channel_id, recalc_attrs;

        -- Step 2: If we have attributes to recalculate, process them
        IF array_length(recalc_attrs, 1) > 0 THEN
            -- Get channel-specific formulas
            SELECT cost_formula INTO channel_config_record
            FROM base_pricing_restaurant.bp_channel_cost_logic_config
            WHERE channel_id = target_record.channel_id AND is_active = true;
            
            IF FOUND THEN
                cost_components := target_record.attributes_to_update;
                
                RAISE NOTICE 'Initial cost_components from updates: %', cost_components;
                
                -- Get the attributes JSONB for this product
                SELECT attributes INTO attributes_json
                FROM base_pricing_restaurant.bp_product_attributes_mapping
                WHERE product_id = target_record.product_id;
                
                IF attributes_json IS NOT NULL THEN
                    -- Add any missing base attributes that are needed for formulas
                    -- Only add if they're not already in the updates
                    FOR base_attr_record IN 
                        SELECT 
                            attr_elem->>'attribute_name' as attribute_name,
                            (attr_elem->'attribute_value'->>'current')::text as current_value
                        FROM jsonb_array_elements(attributes_json) AS attr_elem
                        WHERE attr_elem->>'attribute_name' IN ('base_cost', 'rebate', 'marketplace_fee', 'shipping_cost')
                        AND NOT (cost_components ? (attr_elem->>'attribute_name'))
                    LOOP
                        IF base_attr_record.current_value IS NOT NULL THEN
                            cost_components := cost_components || 
                                jsonb_build_object(base_attr_record.attribute_name, base_attr_record.current_value);
                            RAISE NOTICE 'Added missing base attribute % = %', 
                                base_attr_record.attribute_name, base_attr_record.current_value;
                        END IF;
                    END LOOP;
                ELSE
                    RAISE NOTICE 'No attributes found in bp_product_attributes_mapping for product_id %', target_record.product_id;
                END IF;
                
                RAISE NOTICE 'Final cost_components for formula: %', cost_components;
                
                -- Recalculate each impacted attribute
                FOREACH attr_name IN ARRAY recalc_attrs
                LOOP
                    formula := channel_config_record.cost_formula->>attr_name;
                    IF formula IS NOT NULL THEN
                        RAISE NOTICE 'Calculating % using formula: %', attr_name, formula;
                        
                        BEGIN
                            calculated_value := base_pricing_restaurant.fn_evaluate_cost_formula(
                                formula, 
                                cost_components
                            );
                            
                            -- Add to attributes_to_update
                            target_record.attributes_to_update := 
                                target_record.attributes_to_update ||
                                jsonb_build_object(attr_name, calculated_value::text);
                                
                            RAISE NOTICE 'Calculated % = %', attr_name, calculated_value;
                            
                        EXCEPTION
                            WHEN OTHERS THEN
                                RAISE NOTICE 'Error calculating %: %', attr_name, SQLERRM;
                        END;
                    ELSE
                        RAISE NOTICE 'No formula found for % in channel config', attr_name;
                    END IF;
                END LOOP;
            ELSE
                RAISE NOTICE 'No active channel config found for channel_id %', target_record.channel_id;
            END IF;
        END IF;

        -- Step 3: Build and execute dynamic UPDATE
        DECLARE
            set_clause text := '';
            attr_key text;
            attr_value text;
            update_query text;
            rows_updated int;
        BEGIN
            -- Build SET clause from all attributes to update
            FOR attr_key, attr_value IN 
                SELECT key, value 
                FROM jsonb_each_text(target_record.attributes_to_update)
            LOOP
                -- Only update columns that exist in the v4 table (attribute_1, attribute_2, etc.)
                IF attr_key LIKE 'attribute_%' THEN
                    IF set_clause != '' THEN
                        set_clause := set_clause || ', ';
                    END IF;
                    
                    set_clause := set_clause || 
                        quote_ident(attr_key) || ' = ' ||
                        CASE 
                            WHEN attr_value = 'true' THEN 'true'
                            WHEN attr_value = 'false' THEN 'false'
                            WHEN attr_value ~ '^-?\d+$' THEN attr_value
                            WHEN attr_value ~ '^-?\d+\.\d+$' THEN attr_value
                            ELSE quote_literal(attr_value)
                        END;
                END IF;
            END LOOP;
            
            IF set_clause != '' THEN
                update_query := 'UPDATE base_pricing_restaurant.bp_product_store_attributes_mapping_v4 SET ' ||
                                set_clause || ', ' ||
                                'updated_at = CURRENT_TIMESTAMP ' ||
                                'WHERE product_id = ' || target_record.product_id ||
                                ' AND store_id = ' || target_record.store_id ||
                                ' AND segment_id = ' || target_record.segment_id;
                
                EXECUTE update_query;
                GET DIAGNOSTICS rows_updated = ROW_COUNT;
                affected_count := affected_count + rows_updated;
            END IF;
        END;
    END LOOP;

    -- Clean up and return
    DROP TABLE temp_updates;
    DROP TABLE temp_target_records;
    
    update_end_time := clock_timestamp();
    RAISE NOTICE 'Update completed: Updated % records in %', 
        affected_count, (update_end_time - update_start_time);
    
    RETURN QUERY SELECT affected_count, input_count;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error in fn_update_product_store_attributes: %', SQLERRM;
        DROP TABLE IF EXISTS temp_updates;
        DROP TABLE IF EXISTS temp_target_records;
        RAISE EXCEPTION 'Error: %', SQLERRM;
END;
$function$
;