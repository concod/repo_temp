--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_temp_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_temp_10

DROP PROCEDURE IF EXISTS base_pricing.sp_temp;

CREATE OR REPLACE PROCEDURE base_pricing.sp_temp(IN p_mv_name_prefix text DEFAULT 'mv_price_change_drivers_'::text, IN p_use_all_hierarchy_levels boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    dynamic_query TEXT;
    mv_full_name TEXT;
    store_level RECORD;
    product_level RECORD;
    store_column_parts TEXT[];
    product_column_parts TEXT[];
    rule_column_parts TEXT[];
    all_column_parts TEXT[];
    active_store_levels INTEGER[];
    activelevels INTEGER[];
    distinct_reasons TEXT[];
    reason TEXT;
    level_id INTEGER;
    -- Variables for hierarchy level mappings
    product_level_name TEXT;
    store_level_name TEXT;
    -- Variables for index column names
    grouped_store_column_name TEXT;
    grouped_product_column_name TEXT;
BEGIN
    -- Get rule names from bp_rule_types table
    SELECT ARRAY_AGG(DISTINCT rule_type ORDER BY rule_type)
    INTO distinct_reasons
    FROM base_pricing.bp_rule_types 
    WHERE rule_type IS NOT NULL 
      AND TRIM(rule_type) != '';

    -- Get active store hierarchy levels (where report_hierarchy_dropdown = true)
    SELECT COALESCE(ARRAY_AGG(store_hierarchy_level_id ORDER BY store_hierarchy_level_id), ARRAY[]::INTEGER[])
    INTO active_store_levels
    FROM base_pricing.bp_store_hierarchy_level 
    WHERE  report_hierarchy_dropdown = true;

    -- Get active product hierarchy levels (where report_hierarchy_dropdown = true)
    SELECT COALESCE(ARRAY_AGG(product_hierarchy_level_id ORDER BY product_hierarchy_level_id), ARRAY[]::INTEGER[])
    INTO activelevels
    FROM base_pricing.bp_product_hierarchy_level 
    WHERE  report_hierarchy_dropdown = true;

        -- Create Product-focused MVs (grouped by product hierarchy)
        FOR product_level IN SELECT product_hierarchy_level_id, 'l' || product_hierarchy_level_id::text || '_name' as product_hierarchy_level_value 
                            FROM base_pricing.bp_product_hierarchy_level 
                            WHERE  report_hierarchy_dropdown = true
                            ORDER BY product_hierarchy_level_id LOOP
            
            -- Create MV name for product grouping
            mv_full_name := 'base_pricing.' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id;
            
            -- Drop existing MV if exists
            EXECUTE 'DROP MATERIALIZED VIEW IF EXISTS ' || mv_full_name || '_delete';
            
            -- Reset arrays
            store_column_parts := ARRAY[]::TEXT[];
            product_column_parts := ARRAY[]::TEXT[];
            rule_column_parts := ARRAY[]::TEXT[];
            all_column_parts := ARRAY[]::TEXT[];
            
            -- Store the grouped column name for indexing
            grouped_product_column_name := LOWER(REGEXP_REPLACE(product_level.product_hierarchy_level_value, '[^a-zA-Z0-9_]', '_', 'g'));
            
            -- Build store hierarchy columns (only for active levels, all aggregated) - removed _agg suffix
            FOREACH level_id IN ARRAY active_store_levels LOOP
                -- Get store level name for this level_id
                SELECT 's' || store_hierarchy_level_id::text || '_name'
                INTO store_level_name
                FROM base_pricing.bp_store_hierarchy_level 
                WHERE store_hierarchy_level_id = level_id;
                
                store_column_parts := store_column_parts || ('STRING_AGG(DISTINCT sm.s' || level_id || '_name, '', '') AS ' || LOWER(REGEXP_REPLACE(store_level_name, '[^a-zA-Z0-9_]', '_', 'g')));
            END LOOP;
            
            -- Build product hierarchy columns (only for active levels) - removed _agg suffix
            FOREACH level_id IN ARRAY activelevels LOOP
                -- Get product level name for this level_id
                SELECT 'l' || product_hierarchy_level_id::text || '_name'
                INTO product_level_name
                FROM base_pricing.bp_product_hierarchy_level
                WHERE product_hierarchy_level_id = level_id;
                
                IF level_id = product_level.product_hierarchy_level_id THEN
                    product_column_parts := product_column_parts || ('pm.l' || level_id || '_name AS ' || LOWER(REGEXP_REPLACE(product_level_name, '[^a-zA-Z0-9_]', '_', 'g')));
                ELSE
                    product_column_parts := product_column_parts || ('STRING_AGG(DISTINCT pm.l' || level_id || '_name, '', '') AS ' || LOWER(REGEXP_REPLACE(product_level_name, '[^a-zA-Z0-9_]', '_', 'g')));
                END IF;
            END LOOP;
            
            -- Build rule-based driver columns (individual columns for each rule type) - removed _count suffix
            FOREACH reason IN ARRAY distinct_reasons LOOP
                rule_column_parts := rule_column_parts || (
                    'SUM(CASE WHEN rf.price_change_reason = ' || quote_literal(reason) || ' AND rf.source = ''IA Recommended'' THEN 1 ELSE 0 END) AS ' || reason
                );
            END LOOP;
            
            -- Combine all column parts
            all_column_parts := store_column_parts || product_column_parts || rule_column_parts;
            
            -- Generate the dynamic query for product-focused MV (removed CTE and WHERE clause)
            dynamic_query := 'CREATE MATERIALIZED VIEW ' || mv_full_name || '_delete AS
            SELECT 
                rf.product_id,
                rf.store_id,
                rf.strategy_id,
                csm.segment_id,
                csm.segment_name' || 
                CASE WHEN COALESCE(array_length(all_column_parts, 1), 0) > 0 THEN
                    ', ' || array_to_string(all_column_parts, ', ')
                ELSE ''
                END || ',
                strat.strategy_name AS strategy_name,
                ssl.strategy_status_display_name AS strategy_status,
                COUNT(DISTINCT CONCAT(rf.product_id::text, ''_'', rf.store_id::text)) AS total_price_points,
                SUM(CASE 
                    WHEN (rf.source = ''IA Recommended'' AND rf.price_change_reason IS NOT NULL)
                         OR rf.source = ''Manual Edit'' 
                    THEN 1 ELSE 0 END) AS price_changes,
                SUM(CASE 
                    WHEN rf.price_change_reason = ''Cost Change'' 
                    THEN 1 ELSE 0 END) AS cost_changes,
                SUM(CASE WHEN rf.source = ''Manual'' THEN 1 ELSE 0 END) AS manual_overrides,
                COUNT(*) AS record_count
            FROM base_pricing.bp_price_reco_finalized rf
            JOIN base_pricing.bp_product_master pm ON rf.product_id = pm.product_id
            JOIN base_pricing.bp_store_master sm ON rf.store_id = sm.store_id
            JOIN base_pricing.bp_customer_segment_master csm ON rf.segment_id = csm.segment_id
            LEFT JOIN base_pricing.bp_strategy_master strat ON rf.strategy_id = strat.strategy_id
            LEFT JOIN base_pricing.bp_strategy_status_level ssl ON strat.strategy_status_id = ssl.strategy_status_id
            GROUP BY 
                rf.product_id,
                rf.store_id,
                rf.strategy_id,
                csm.segment_id,
                csm.segment_name,
                pm.l' || product_level.product_hierarchy_level_id || '_name,
                strat.strategy_name,
                ssl.strategy_status_display_name';

            -- Execute the CREATE MATERIALIZED VIEW statement
            EXECUTE dynamic_query;
            
            -- Create indexes using the correct column names
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_delete_strategy ON ' || mv_full_name || '_delete (strategy_id)';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_delete_product_name ON ' || mv_full_name || '_delete (' || grouped_product_column_name || ')';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_delete_product_id ON ' || mv_full_name || '_delete (product_id)';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_delete_store_id ON ' || mv_full_name || '_delete (store_id)';
            EXECUTE 'CREATE INDEX idx_' || p_mv_name_prefix || 'l' || product_level.product_hierarchy_level_id || '_delete_segment ON ' || mv_full_name || '_delete (segment_id, segment_name)';
            
            RAISE NOTICE 'Product-focused materialized view % created successfully', mv_full_name || '_delete';
            
        END LOOP; -- End product level loop
    
END $procedure$
;
