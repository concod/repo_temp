--liquibase formatted sql
--changeset ezhilkannan@impactanalytics.co:optimize_swap_sp_wp_data_performance runOnChange:true stripComments:false splitStatements:false context:optimize_swap_sp_wp_data_performance labels:liquibase_project_start
--comment: Optimize swap_sp_wp_data function - removed excessive logging, consolidated operations, reduced code from 457 to 150 lines while maintaining all business logic
DROP FUNCTION IF EXISTS assort_smart.swap_sp_wp_data(sp_plan_code integer, wp_plan_code integer);
CREATE OR REPLACE FUNCTION assort_smart.swap_sp_wp_data(sp_plan_code integer, wp_plan_code integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    table_prefix TEXT[] := ARRAY[
        'plan_budget_master',
        'plan_budget_master_drop',
        'plan_cluster_aps',
        'plan_cluster_depth_choice',
        'plan_hierarchy_aps',
        'plan_hierarchy_budget_opt_master',
        'plan_new_hierarchy',
        'plan_wedge_opt_constraint'
    ];
    primary_keys_map JSONB := '{
        "plan_budget_master": "plan_budget_id",
        "plan_cluster_aps": "plan_clu_aps_id",
        "plan_cluster_depth_choice": "plan_cls_depth_id",
        "plan_hierarchy_aps": "plan_hierarchy_aps_id",
        "plan_hierarchy_budget_opt_master": "plan_hierarchy_budget_opt_master_id",
        "plan_budget_master_drop": "plan_bud_mst_drp_id",
        "plan_new_hierarchy": "None",
        "plan_wedge_opt_constraint": "None"
    }';
    table_name_sp TEXT;
    table_name_wp TEXT;
    table_index INT;
    column_list TEXT;
    temp_sp_table_name TEXT;
    temp_wp_table_name TEXT;
    primary_key_column TEXT;
    schema_name TEXT := 'assort_smart';
    timestamp_str TEXT;
    temp_plan_attributes_sp TEXT;
    temp_plan_attributes_wp TEXT;
    sp_name VARCHAR;
    wp_name VARCHAR;
BEGIN
    -- Generate timestamp string for temporary table names
    timestamp_str := to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS_MS');
    temp_plan_attributes_sp := 'temp_plan_attributes_sp_' || timestamp_str;
    temp_plan_attributes_wp := 'temp_plan_attributes_wp_' || timestamp_str;

    -- Swap record types first (maintaining original order for trigger compatibility)
    UPDATE assort_smart.plan_master
    SET record_type = CASE WHEN plan_code = wp_plan_code THEN 'SP' ELSE 'WP' END
    WHERE plan_code IN (wp_plan_code, sp_plan_code);

    -- Fetch and swap names
    SELECT name INTO sp_name FROM assort_smart.plan_master WHERE plan_code = sp_plan_code;
    SELECT name INTO wp_name FROM assort_smart.plan_master WHERE plan_code = wp_plan_code;
    
    UPDATE assort_smart.plan_master
    SET name = CASE 
        WHEN plan_code = sp_plan_code THEN wp_name
        WHEN plan_code = wp_plan_code THEN sp_name
    END
    WHERE plan_code IN (sp_plan_code, wp_plan_code);

    -- Update line review mapper
    UPDATE assort_smart.plan_master_line_review_mapper
    SET plan_code = sp_plan_code
    WHERE plan_code = wp_plan_code;

    -- Handle plan_attributes table swap
    EXECUTE format('CREATE TEMP TABLE %s AS SELECT * FROM assort_smart.plan_attributes WHERE plan_code = $1', temp_plan_attributes_sp) USING sp_plan_code;
    EXECUTE format('CREATE TEMP TABLE %s AS SELECT * FROM assort_smart.plan_attributes WHERE plan_code = $1', temp_plan_attributes_wp) USING wp_plan_code;
    
    EXECUTE format('UPDATE %s SET plan_code = $1', temp_plan_attributes_sp) USING wp_plan_code;
    EXECUTE format('UPDATE %s SET plan_code = $1', temp_plan_attributes_wp) USING sp_plan_code;
    
    EXECUTE format('DELETE FROM assort_smart.plan_attributes WHERE plan_code IN (%s, %s)', sp_plan_code, wp_plan_code);
    EXECUTE format('INSERT INTO assort_smart.plan_attributes SELECT * FROM %s UNION SELECT * FROM %s', temp_plan_attributes_sp, temp_plan_attributes_wp);
    
    EXECUTE format('DROP TABLE IF EXISTS %s, %s', temp_plan_attributes_sp, temp_plan_attributes_wp);

    -- Swap data between sp and wp tables
    FOR table_index IN 1 .. array_length(table_prefix, 1) LOOP
        -- Construct table names
        table_name_sp := 'assort_smart.' || table_prefix[table_index] || '_sp';
        table_name_wp := 'assort_smart.' || table_prefix[table_index] || '_wp';
        temp_sp_table_name := 'temp_sp_' || table_index || '_' || timestamp_str;
        temp_wp_table_name := 'temp_wp_' || table_index || '_' || timestamp_str;
        primary_key_column := primary_keys_map->>table_prefix[table_index];

        -- Get column list dynamically, excluding primary key
        EXECUTE format(
            'SELECT string_agg(quote_ident(column_name), '','') 
             FROM information_schema.columns
             WHERE table_schema = %L
             AND table_name = %L
             AND column_name != %L',
            schema_name,
            table_prefix[table_index] || '_sp',
            primary_key_column
        ) INTO column_list;

        -- Create temp tables and swap data
        EXECUTE format('CREATE TEMP TABLE %s AS SELECT %s FROM %s WHERE plan_code = $1', temp_sp_table_name, column_list, table_name_sp) USING sp_plan_code;
        EXECUTE format('CREATE TEMP TABLE %s AS SELECT %s FROM %s WHERE plan_code = $1', temp_wp_table_name, column_list, table_name_wp) USING wp_plan_code;

        -- Insert swapped data
        EXECUTE format('INSERT INTO %s (%s) SELECT %s FROM %s', table_name_sp, column_list, column_list, temp_wp_table_name);
        EXECUTE format('INSERT INTO %s (%s) SELECT %s FROM %s', table_name_wp, column_list, column_list, temp_sp_table_name);

        -- Clean up temp tables and delete old data
        EXECUTE format('DROP TABLE IF EXISTS %s, %s', temp_sp_table_name, temp_wp_table_name);
        EXECUTE format('DELETE FROM %s WHERE plan_code = $1', table_name_sp) USING sp_plan_code;
        EXECUTE format('DELETE FROM %s WHERE plan_code = $1', table_name_wp) USING wp_plan_code;
    END LOOP;

    -- Swap plan_cluster_opt_master tables with set-based operations
    -- Create temporary tables
    EXECUTE format('CREATE TEMP TABLE temp_sp_opt_master_%s AS SELECT * FROM assort_smart.plan_cluster_opt_master_sp WHERE plan_code = $1', timestamp_str) USING sp_plan_code;
    EXECUTE format('CREATE TEMP TABLE temp_wp_opt_master_%s AS SELECT * FROM assort_smart.plan_cluster_opt_master_wp WHERE plan_code = $1', timestamp_str) USING wp_plan_code;
    
    -- Create ID mapping tables
    EXECUTE format('CREATE TEMP TABLE sp_id_mapping_%s (new_pcoid INT, old_pcoid INT)', timestamp_str);
    EXECUTE format('CREATE TEMP TABLE wp_id_mapping_%s (new_pcoid INT, old_pcoid INT)', timestamp_str);
    
    -- Store attributes with master IDs
    EXECUTE format('CREATE TEMP TABLE sp_opt_attr_%s AS SELECT a.*, m.plan_clu_opt_id AS master_id FROM assort_smart.plan_cluster_opt_attribute_sp a JOIN temp_sp_opt_master_%s m ON a.plan_clu_opt_id = m.plan_clu_opt_id', timestamp_str, timestamp_str);
    EXECUTE format('CREATE TEMP TABLE wp_opt_attr_%s AS SELECT a.*, m.plan_clu_opt_id AS master_id FROM assort_smart.plan_cluster_opt_attribute_wp a JOIN temp_wp_opt_master_%s m ON a.plan_clu_opt_id = m.plan_clu_opt_id', timestamp_str, timestamp_str);
    
    -- Delete existing attributes and master records
    EXECUTE format('DELETE FROM assort_smart.plan_cluster_opt_attribute_sp WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_sp_opt_master_%s)', timestamp_str);
    EXECUTE format('DELETE FROM assort_smart.plan_cluster_opt_attribute_wp WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_wp_opt_master_%s)', timestamp_str);
    EXECUTE format('DELETE FROM assort_smart.plan_cluster_opt_master_sp WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_sp_opt_master_%s)', timestamp_str);
    EXECUTE format('DELETE FROM assort_smart.plan_cluster_opt_master_wp WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_wp_opt_master_%s)', timestamp_str);
    
    -- Insert SP masters into WP and create ID mapping
    EXECUTE format('INSERT INTO assort_smart.plan_cluster_opt_master_wp (plan_code, hierarchy_code, season_code, channel, sub_channel, l3_budget_ty, sell_through, penetration_ly, penetration_ty, l3_penetration_ly, l3_penetration_ty, margin_percentage, receipts_quantity_ty, cluster_code, cluster_display_name, optimization_level, carryover_flag, compare_type, new_l3_flag, is_active) SELECT plan_code, hierarchy_code, season_code, channel, sub_channel, l3_budget_ty, sell_through, penetration_ly, penetration_ty, l3_penetration_ly, l3_penetration_ty, margin_percentage, receipts_quantity_ty, cluster_code, cluster_display_name, optimization_level, carryover_flag, compare_type, new_l3_flag, is_active FROM temp_sp_opt_master_%s', timestamp_str);
    
    EXECUTE format('WITH w_dedup AS (SELECT plan_clu_opt_id, plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code, row_number() OVER (PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code ORDER BY plan_clu_opt_id) AS rn FROM assort_smart.plan_cluster_opt_master_wp WHERE plan_code = $1), s_dedup AS (SELECT plan_clu_opt_id, plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code, row_number() OVER (PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code ORDER BY plan_clu_opt_id) AS rn FROM temp_sp_opt_master_%s) INSERT INTO sp_id_mapping_%s (new_pcoid, old_pcoid) SELECT w.plan_clu_opt_id, s.plan_clu_opt_id FROM w_dedup w JOIN s_dedup s ON w.plan_code = s.plan_code AND w.hierarchy_code = s.hierarchy_code AND w.season_code = s.season_code AND w.channel = s.channel AND w.sub_channel = s.sub_channel AND w.cluster_code = s.cluster_code AND w.rn = s.rn', timestamp_str, timestamp_str) USING sp_plan_code;
    
    -- Insert WP masters into SP and create ID mapping
    EXECUTE format('INSERT INTO assort_smart.plan_cluster_opt_master_sp (plan_code, hierarchy_code, season_code, channel, sub_channel, l3_budget_ty, sell_through, penetration_ly, penetration_ty, l3_penetration_ly, l3_penetration_ty, margin_percentage, receipts_quantity_ty, cluster_code, cluster_display_name, optimization_level, carryover_flag, compare_type, new_l3_flag, is_active) SELECT plan_code, hierarchy_code, season_code, channel, sub_channel, l3_budget_ty, sell_through, penetration_ly, penetration_ty, l3_penetration_ly, l3_penetration_ty, margin_percentage, receipts_quantity_ty, cluster_code, cluster_display_name, optimization_level, carryover_flag, compare_type, new_l3_flag, is_active FROM temp_wp_opt_master_%s', timestamp_str);
    
    EXECUTE format('WITH s_dedup AS (SELECT plan_clu_opt_id, plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code, row_number() OVER (PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code ORDER BY plan_clu_opt_id) AS rn FROM assort_smart.plan_cluster_opt_master_sp WHERE plan_code = $1), w_dedup AS (SELECT plan_clu_opt_id, plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code, row_number() OVER (PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code ORDER BY plan_clu_opt_id) AS rn FROM temp_wp_opt_master_%s) INSERT INTO wp_id_mapping_%s (new_pcoid, old_pcoid) SELECT s.plan_clu_opt_id, w.plan_clu_opt_id FROM s_dedup s JOIN w_dedup w ON s.plan_code = w.plan_code AND s.hierarchy_code = w.hierarchy_code AND s.season_code = w.season_code AND s.channel = w.channel AND s.sub_channel = w.sub_channel AND s.cluster_code = w.cluster_code AND s.rn = w.rn', timestamp_str, timestamp_str) USING wp_plan_code;
    
    -- Insert attributes with updated foreign keys
    EXECUTE format('INSERT INTO assort_smart.plan_cluster_opt_attribute_wp (attribute_name, sub_attribute_name, sell_through, penetration_ly, penetration_ty, total_quantity, margin_percentage, plan_clu_opt_id) SELECT a.attribute_name, a.sub_attribute_name, a.sell_through, a.penetration_ly, a.penetration_ty, a.total_quantity, a.margin_percentage, m.new_pcoid FROM sp_opt_attr_%s a JOIN sp_id_mapping_%s m ON a.master_id = m.old_pcoid', timestamp_str, timestamp_str);
    EXECUTE format('INSERT INTO assort_smart.plan_cluster_opt_attribute_sp (attribute_name, sub_attribute_name, sell_through, penetration_ly, penetration_ty, total_quantity, margin_percentage, plan_clu_opt_id) SELECT a.attribute_name, a.sub_attribute_name, a.sell_through, a.penetration_ly, a.penetration_ty, a.total_quantity, a.margin_percentage, m.new_pcoid FROM wp_opt_attr_%s a JOIN wp_id_mapping_%s m ON a.master_id = m.old_pcoid', timestamp_str, timestamp_str);
    
    -- Clean up all temporary tables (fixed: using correct table names, not the typo from original)
    EXECUTE format('DROP TABLE IF EXISTS temp_sp_opt_master_%s, temp_wp_opt_master_%s, sp_opt_attr_%s, wp_opt_attr_%s, sp_id_mapping_%s, wp_id_mapping_%s', timestamp_str, timestamp_str, timestamp_str, timestamp_str, timestamp_str, timestamp_str);
END;
$function$
;