--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_create_dynamic_price_driver_mv stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_create_dynamic_price_driver_mv

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_create_dynamic_price_driver_mv;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_create_dynamic_price_driver_mv(IN p_mv_name_prefix text DEFAULT 'mv_price_change_drivers_'::text, IN p_use_all_hierarchy_levels boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    dynamic_query TEXT;
    mv_full_name TEXT;
    product_level RECORD;
    store_column_parts TEXT[];
    product_column_parts TEXT[];
    rule_column_parts TEXT[];
    all_column_parts TEXT[];
    active_store_levels INTEGER[];
    active_product_levels INTEGER[];
    distinct_rule_types TEXT[];
    reason TEXT;
    level_id INTEGER;
    product_level_name TEXT;
    store_level_name TEXT;
    grouped_store_column_name TEXT;
    main_hierarchy_column_name TEXT;
BEGIN
    -- Get rule names from bp_rule_types table
    SELECT ARRAY_AGG(DISTINCT rule_type ORDER BY rule_type)
    INTO distinct_rule_types
    FROM base_pricing_restaurant.bp_rule_types 
    WHERE rule_type IS NOT NULL 
      AND TRIM(rule_type) != '';
    

    -- Get active store hierarchy levels (where report_hierarchy_dropdown = true)
    SELECT COALESCE(ARRAY_AGG(store_hierarchy_level_id ORDER BY store_hierarchy_level_id), ARRAY[]::INTEGER[])
    INTO active_store_levels
    FROM base_pricing_restaurant.bp_store_hierarchy_level 
    WHERE  report_hierarchy_dropdown = true;

    -- Get active product hierarchy levels (where report_hierarchy_dropdown = true)
    SELECT COALESCE(ARRAY_AGG(product_hierarchy_level_id ORDER BY product_hierarchy_level_id), ARRAY[]::INTEGER[])
    INTO active_product_levels
    FROM base_pricing_restaurant.bp_product_hierarchy_level 
    WHERE  report_hierarchy_dropdown = true;

    -- Create MVs for all hierarchy levels if requested
    IF p_use_all_hierarchy_levels THEN        
        
        -- Create Product-focused MVs (grouped by product hierarchy)
        FOR product_level IN SELECT product_hierarchy_level_id, product_hierarchy_level_value 
                            FROM base_pricing_restaurant.bp_product_hierarchy_level 
                            WHERE  report_hierarchy_dropdown = true
                            ORDER BY product_hierarchy_level_id LOOP
            
            -- Create MV name for product grouping
            mv_full_name := 'base_pricing_restaurant.' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id;
            
            -- Drop existing MV if exists
            EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || mv_full_name;
            
            -- Reset arrays
            store_column_parts := ARRAY[]::TEXT[];
            product_column_parts := ARRAY[]::TEXT[];
            rule_column_parts := ARRAY[]::TEXT[];
            all_column_parts := ARRAY[]::TEXT[];
            
            -- Store the grouped column name for indexing
            main_hierarchy_column_name := 'l' || product_level.product_hierarchy_level_id || '_name';
            
            -- Build store hierarchy columns (only for active levels) 
            FOREACH level_id IN ARRAY active_store_levels LOOP
                store_column_parts := store_column_parts || ('STRING_AGG(DISTINCT sm.s' || level_id || '_name, '', '') AS ' || 's' || level_id || '_name');
            END LOOP;
            

            -- Build product hierarchy columns (only for active levels)
            FOREACH level_id IN ARRAY active_product_levels LOOP
                SELECT product_hierarchy_level_value INTO product_level_name
                FROM base_pricing_restaurant.bp_product_hierarchy_level 
                WHERE product_hierarchy_level_id = level_id;
                
                IF level_id = product_level.product_hierarchy_level_id THEN
                    product_column_parts := product_column_parts || ('pm.l' || level_id || '_name AS ' || 'l' || level_id || '_name');
                ELSE
                    product_column_parts := product_column_parts || ('STRING_AGG(DISTINCT pm.l' || level_id || '_name, '', '') AS '  || 'l' || level_id || '_name');
                END IF;
            END LOOP;

            
            -- Build rule-based driver columns (individual columns for each rule type) - removed _count suffix
            FOREACH reason IN ARRAY distinct_rule_types LOOP
                rule_column_parts := rule_column_parts || (
                    'SUM(CASE WHEN fin.price_change_reason = ' || quote_literal(reason) || ' AND fin.source = ''IA Recommended'' THEN 1 ELSE 0 END) AS ' || 
                    LOWER(REGEXP_REPLACE(REGEXP_REPLACE(reason, '[^a-zA-Z0-9_]', '_', 'g'), '_+', '_', 'g'))
                );
            END LOOP;
            
            -- Combine all column parts
            all_column_parts := store_column_parts || product_column_parts || rule_column_parts;
            
            -- Generate the dynamic query for product-focused MV (removed CTE and WHERE clause)
            dynamic_query := 'CREATE MATERIALIZED VIEW ' || mv_full_name || ' AS
            SELECT 
                fin.product_id,
                fin.store_id,
                fin.strategy_id,
                csm.segment_id,
                csm.segment_name' || 
                CASE WHEN COALESCE(array_length(all_column_parts, 1), 0) > 0 THEN
                    ', ' || array_to_string(all_column_parts, ', ')
                ELSE ''
                END || ',
                strat.strategy_name AS strategy_name,
                ssl.strategy_status_display_name AS strategy_status,
                COUNT(DISTINCT CONCAT(fin.product_id::text, ''_'', fin.store_id::text)) AS total_price_points,
	            SUM(CASE 
	                WHEN (fin.source = ''IA Recommended'' AND fin.price_change_reason IS NOT NULL)
	                     OR fin.source = ''Manual Edit'' 
	                THEN 1 ELSE 0 END) AS price_changes,
	            SUM(CASE 
	                WHEN fin.price_change_reason = ''Cost Change'' 
	                THEN 1 ELSE 0 END) AS cost_changes,
	            SUM(CASE WHEN fin.source = ''Manual'' THEN 1 ELSE 0 END) AS manual_overrides,
                COUNT(*) AS record_count
            FROM base_pricing_restaurant.bp_price_reco_finalized fin
            JOIN base_pricing_restaurant.bp_product_master pm ON fin.product_id = pm.product_id
            JOIN base_pricing_restaurant.bp_store_master sm ON fin.store_id = sm.store_id
            JOIN base_pricing_restaurant.bp_customer_segment_master csm ON fin.segment_id = csm.segment_id
            LEFT JOIN base_pricing_restaurant.bp_strategy_master strat ON fin.strategy_id = strat.strategy_id
            LEFT JOIN base_pricing_restaurant.bp_strategy_status_level ssl ON strat.strategy_status_id = ssl.strategy_status_id
            GROUP BY 
                fin.product_id,
                fin.store_id,
                fin.strategy_id,
                csm.segment_id,
                csm.segment_name,
                pm.l' || product_level.product_hierarchy_level_id || '_name,
                strat.strategy_name,
                ssl.strategy_status_display_name';

            -- Execute the CREATE MATERIALIZED VIEW statement
            EXECUTE dynamic_query;
            
            -- Create indexes using the correct column names
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_strategy ON ' || mv_full_name || ' (strategy_id)';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_product_name ON ' || mv_full_name || ' (' || main_hierarchy_column_name || ')';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_product_id ON ' || mv_full_name || ' (product_id)';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_store_id ON ' || mv_full_name || ' (store_id)';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_segment ON ' || mv_full_name || ' (segment_id, segment_name)';
            
            RAISE NOTICE 'Product-focused materialized view % created successfully', mv_full_name;
            
        END LOOP; -- End product level loop
        
    ELSE
        -- Original single MV creation logic (fallback)
        mv_full_name := 'base_pricing_restaurant.' || p_mv_name_prefix || '_mv';
        
        -- Drop existing MV if exists
        EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || mv_full_name;
        
        RAISE NOTICE 'Single MV creation not implemented in this version';
    END IF;
    
END $procedure$
;