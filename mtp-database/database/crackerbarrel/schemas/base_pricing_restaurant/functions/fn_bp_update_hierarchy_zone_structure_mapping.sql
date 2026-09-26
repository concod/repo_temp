--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_bp_update_hierarchy_zone_structure_mapping stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_bp_update_hierarchy_zone_structure_mapping

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_bp_update_hierarchy_zone_structure_mapping;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_bp_update_hierarchy_zone_structure_mapping(json_input jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    hierarchy_level TEXT;
    hierarchy_zone_mapping JSONB;
    is_all_selected BOOLEAN;
    product_filter JSONB;
    column_name TEXT;
    zone_structure_id INT;
    hierarchy_level_id INT;
    segment_id INT;
    hierarchy_ids INT[];
BEGIN
    -- Extract values from the input JSON
    is_all_selected := COALESCE(json_input->>'is_all_selected', 'false')::BOOLEAN;
    hierarchy_level := json_input->>'hierarchy_level';
    hierarchy_zone_mapping := json_input->'hierarchy_zone_mapping';
    product_filter := json_input->'product_filter';

    -- Validate required input fields
    IF hierarchy_level IS NULL OR hierarchy_zone_mapping IS NULL THEN
        RAISE EXCEPTION 'Invalid input: hierarchy_level or hierarchy_zone_mapping is missing';
    END IF;

    -- Dynamically construct the column name (e.g., 'l4_cid')
    column_name := hierarchy_level || '_cid';

    -- Case 1: is_all_selected = true
    IF is_all_selected THEN
        -- Validate product_filter and hierarchies
        IF product_filter IS NULL OR product_filter->'hierarchies' IS NULL THEN
            RAISE EXCEPTION 'Invalid input: product_filter or hierarchies is missing for is_all_selected = true';
        END IF;

        -- Extract hierarchy IDs from the filter
        SELECT array_agg(value::text::int) 
        INTO hierarchy_ids
        FROM jsonb_array_elements(product_filter->'hierarchies'->(hierarchy_level||'_ids')) AS value;

        -- Process each mapping in the array
        FOR i IN 0..jsonb_array_length(hierarchy_zone_mapping)-1 LOOP
            segment_id := (hierarchy_zone_mapping->i->>'customer_segment_id')::INT;
            zone_structure_id := (hierarchy_zone_mapping->i->>'zone_structure_id')::INT;

            EXECUTE format(
                'UPDATE base_pricing_restaurant.bp_product_customer_segment_prices
                 SET zone_structure_id = $1
                 WHERE segment_id = $2
                 AND product_id IN (
                    SELECT product_id FROM base_pricing_restaurant.bp_product_master
                    WHERE %I = ANY($3)
                 )', 
                column_name
            ) USING zone_structure_id, segment_id, hierarchy_ids;
        END LOOP;

    -- Case 2: is_all_selected = false
    ELSE
        -- Process each mapping in the array
        FOR i IN 0..jsonb_array_length(hierarchy_zone_mapping)-1 LOOP
            hierarchy_level_id := (hierarchy_zone_mapping->i->>'hierarchy_level_id')::INT;
            segment_id := (hierarchy_zone_mapping->i->>'customer_segment_id')::INT;
            zone_structure_id := (hierarchy_zone_mapping->i->>'zone_structure_id')::INT;

            EXECUTE format(
                'UPDATE base_pricing_restaurant.bp_product_customer_segment_prices
                 SET zone_structure_id = $1
                 WHERE segment_id = $2
                 AND product_id IN (
                    SELECT product_id FROM base_pricing_restaurant.bp_product_master
                    WHERE %I = $3
                 )',
                column_name
            ) USING zone_structure_id, segment_id, hierarchy_level_id;
        END LOOP;
    END IF;
END;
$function$
;