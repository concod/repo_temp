--liquibase formatted sql
--changeset rishabh.kumar@impactanalytics.co:fix_swap_plan_issue_attr_fix_swaping runOnChange:true stripComments:false splitStatements:false context:fix_swap_plan_issue_attr_fix_swaping labels:liquibase_project_start
--comment: Fix swap plan issue
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
    table_suffix_sp TEXT := '_sp';
    table_suffix_wp TEXT := '_wp';
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
    row_count INT;
    sp_name VARCHAR;
    wp_name VARCHAR;
BEGIN
    -- Generate timestamp string for temporary table names
    timestamp_str := to_char(clock_timestamp(), 'YYYYMMDD_HH24MISS_MS');
    
    -- Set temporary table names with timestamp
    temp_plan_attributes_sp := 'temp_plan_attributes_sp_' || timestamp_str;
    temp_plan_attributes_wp := 'temp_plan_attributes_wp_' || timestamp_str;

    -- Start transaction
    BEGIN
        -- Swapping the record types between the sp and wp tables
        UPDATE assort_smart.plan_master
        SET record_type = CASE WHEN plan_code = wp_plan_code THEN 'SP' ELSE 'WP' END
        WHERE plan_code IN (wp_plan_code, sp_plan_code);

        SELECT name INTO sp_name FROM assort_smart.plan_master WHERE plan_code = sp_plan_code;
        SELECT name INTO wp_name FROM assort_smart.plan_master WHERE plan_code = wp_plan_code;
		
        -- Update with swapped names
        UPDATE assort_smart.plan_master
        SET name = CASE 
                    WHEN plan_code = sp_plan_code THEN wp_name
                    WHEN plan_code = wp_plan_code THEN sp_name
                  END
        WHERE plan_code IN (sp_plan_code, wp_plan_code);

        RAISE NOTICE 'Swapping plan_code values between % and %', sp_plan_code, wp_plan_code;

        -- Minimal edit: ensure line review mapper reflects swap (wp -> sp)
        UPDATE assort_smart.plan_master_line_review_mapper
        SET plan_code = sp_plan_code
        WHERE plan_code = wp_plan_code;

        -- Handle plan_attributes table
        EXECUTE format(
                'CREATE TEMP TABLE %s AS SELECT * FROM assort_smart.plan_attributes WHERE plan_code = $1',
                temp_plan_attributes_sp
            ) USING sp_plan_code;

        EXECUTE format(
                'UPDATE %s set plan_code = $1', temp_plan_attributes_sp
        ) USING wp_plan_code;

        EXECUTE format(
                'CREATE TEMP TABLE %s AS SELECT * FROM assort_smart.plan_attributes WHERE plan_code = $1',
                temp_plan_attributes_wp
            ) USING wp_plan_code;

        EXECUTE format(
                'UPDATE %s set plan_code = $1', temp_plan_attributes_wp
        ) USING sp_plan_code;

        EXECUTE FORMAT(
                'DELETE from assort_smart.plan_attributes where plan_code in (%s, %s)',
                sp_plan_code, wp_plan_code
        );

        EXECUTE format('
         INSERT into assort_smart.plan_attributes select * from %s union select * from %s
        ', temp_plan_attributes_sp, temp_plan_attributes_wp
        );

        EXECUTE format('DROP TABLE IF EXISTS %s', temp_plan_attributes_wp);
        EXECUTE format('DROP TABLE IF EXISTS %s', temp_plan_attributes_sp);

        -- Swapping the data between sp and wp for each table
        FOR table_index IN 1 .. array_length(table_prefix, 1) LOOP
            -- Construct table names
            table_name_sp := 'assort_smart.' || table_prefix[table_index] || table_suffix_sp;
            table_name_wp := 'assort_smart.' || table_prefix[table_index] || table_suffix_wp;
            temp_sp_table_name := 'temp_sp_' || table_index || '_' || timestamp_str;
            temp_wp_table_name := 'temp_wp_' || table_index || '_' || timestamp_str;
            primary_key_column := primary_keys_map->>table_prefix[table_index];

            -- Get the column list dynamically, excluding primary key columns
            RAISE NOTICE 'Generated query: %',
            format(
                'SELECT string_agg(quote_ident(column_name), '','')
                 FROM information_schema.columns
                 WHERE table_schema = %L
                 AND table_name = %L
                 AND column_name != %L',
                schema_name,
                table_prefix[table_index] || table_suffix_sp,
                primary_key_column
            );
            EXECUTE format(
                'SELECT string_agg(quote_ident(column_name), '','') FROM information_schema.columns
                 WHERE table_schema = %L
                 AND table_name = %L
                 AND column_name != %L',
                 schema_name,
                table_prefix[table_index] || table_suffix_sp,
                primary_key_column
            ) INTO column_list;

            -- Log the query to create a temp table for swapping data
            RAISE NOTICE 'Creating temporary table % with columns: %', temp_sp_table_name, column_list;
            RAISE NOTICE 'Generated query: %',
            format(
                'CREATE TEMP TABLE %s AS SELECT %s FROM %s WHERE plan_code = %s',
                temp_sp_table_name, column_list, table_name_sp, sp_plan_code
            );
            EXECUTE format(
                'CREATE TEMP TABLE %s AS SELECT %s FROM %s WHERE plan_code = $1',
                temp_sp_table_name, column_list, table_name_sp
            ) USING sp_plan_code;
            GET DIAGNOSTICS row_count = ROW_COUNT;
            RAISE NOTICE 'Number of rows in temp_sp_1: %', row_count;

            RAISE NOTICE 'Creating temporary table % with columns: %', temp_wp_table_name, column_list;
            EXECUTE format(
                'CREATE TEMP TABLE %s AS SELECT %s FROM %s WHERE plan_code = $1',
                temp_wp_table_name, column_list, table_name_wp
            ) USING wp_plan_code;

            -- Log the query for inserting data from _wp to _sp
            RAISE NOTICE 'Inserting data into % from %', table_name_sp, table_name_wp;
            RAISE NOTICE 'Generated query: %',
            format(
                'INSERT INTO %s (%s) SELECT %s FROM %s',
                table_name_sp, column_list, column_list, temp_wp_table_name
            );
            EXECUTE format(
                'INSERT INTO %s (%s) SELECT %s FROM %s',
                table_name_sp, column_list, column_list, temp_wp_table_name
            );

            -- Log the query for swapping data from the temp table to _wp
            RAISE NOTICE 'Inserting data into % from temp table %', table_name_wp, temp_sp_table_name;
            RAISE NOTICE 'Generated query: %',
            format(
                'INSERT INTO %s (%s) SELECT %s FROM %s',
                table_name_wp, column_list, column_list, temp_sp_table_name
            );
            EXECUTE format(
                'INSERT INTO %s (%s) SELECT %s FROM %s',
                table_name_wp, column_list, column_list, temp_sp_table_name
            );

            -- Log the query for dropping the temp table
            RAISE NOTICE 'Dropping temporary table %', temp_sp_table_name;
            EXECUTE format('DROP TABLE IF EXISTS %s', temp_sp_table_name);

            RAISE NOTICE 'Dropping temporary table %', temp_wp_table_name;
            EXECUTE format('DROP TABLE IF EXISTS %s', temp_wp_table_name);

            -- DELETE data
            RAISE NOTICE 'Generated query: %',
            format(
                'DELETE FROM %s where plan_code = %s', table_name_sp, sp_plan_code
            );
            EXECUTE format(
                'DELETE FROM %s where plan_code = $1', table_name_sp
            ) using sp_plan_code;

            EXECUTE format(
                'DELETE FROM %s where plan_code = $1', table_name_wp
            ) using wp_plan_code;
        END LOOP;

        -- OPTIMIZED SECTION: Replacing row-by-row processing with set-based operations
        -- Create temporary tables for the SP to WP migration
        EXECUTE format(
            'CREATE TEMP TABLE temp_sp_opt_master_%s AS 
             SELECT * FROM assort_smart.plan_cluster_opt_master_sp WHERE plan_code = $1', 
            timestamp_str
        ) USING sp_plan_code;
        
        -- Record the count for logging
        GET DIAGNOSTICS row_count = ROW_COUNT;
        RAISE NOTICE 'Number of rows in temp_sp_opt_master: %', row_count;
        
        -- Create temporary tables for the WP to SP migration
        EXECUTE format(
            'CREATE TEMP TABLE temp_wp_opt_master_%s AS 
             SELECT * FROM assort_smart.plan_cluster_opt_master_wp WHERE plan_code = $1',
            timestamp_str
        ) USING wp_plan_code;
        
        -- Record the count for logging
        GET DIAGNOSTICS row_count = ROW_COUNT;
        RAISE NOTICE 'Number of rows in temp_wp_opt_master: %', row_count;
        
        -- Create tables for ID mapping with proper column names to avoid ambiguity
        EXECUTE format(
            'CREATE TEMP TABLE sp_id_mapping_%s (
                new_pcoid INT,
                old_pcoid INT
            )', timestamp_str
        );
        
        EXECUTE format(
            'CREATE TEMP TABLE wp_id_mapping_%s (
                new_pcoid INT,
                old_pcoid INT
            )', timestamp_str
        );
        
        -- Store the original IDs for SP records
        EXECUTE format(
            'CREATE TEMP TABLE sp_opt_attr_%s AS
             SELECT 
                a.*, 
                m.plan_clu_opt_id AS master_id
             FROM 
                assort_smart.plan_cluster_opt_attribute_sp a
             JOIN 
                temp_sp_opt_master_%s m ON a.plan_clu_opt_id = m.plan_clu_opt_id',
            timestamp_str, timestamp_str
        );
        
        -- Store the original IDs for WP records
        EXECUTE format(
            'CREATE TEMP TABLE wp_opt_attr_%s AS
             SELECT 
                a.*, 
                m.plan_clu_opt_id AS master_id
             FROM 
                assort_smart.plan_cluster_opt_attribute_wp a
             JOIN 
                temp_wp_opt_master_%s m ON a.plan_clu_opt_id = m.plan_clu_opt_id',
            timestamp_str, timestamp_str
        );
                
        -- Delete the SP attributes linked to the records we're migrating
        EXECUTE format(
            'DELETE FROM assort_smart.plan_cluster_opt_attribute_sp
             WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_sp_opt_master_%s)',
            timestamp_str
        );
        
        -- Delete the WP attributes linked to the records we're migrating
        EXECUTE format(
            'DELETE FROM assort_smart.plan_cluster_opt_attribute_wp
             WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_wp_opt_master_%s)',
            timestamp_str
        );
        
        -- Delete the original master records
        EXECUTE format(
            'DELETE FROM assort_smart.plan_cluster_opt_master_sp
             WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_sp_opt_master_%s)',
            timestamp_str
        );
        
        EXECUTE format(
            'DELETE FROM assort_smart.plan_cluster_opt_master_wp
             WHERE plan_clu_opt_id IN (SELECT plan_clu_opt_id FROM temp_wp_opt_master_%s)',
            timestamp_str
        );
        
        -- Insert SP masters into WP
        EXECUTE format('
            INSERT INTO assort_smart.plan_cluster_opt_master_wp 
            (plan_code, hierarchy_code, season_code, channel, sub_channel,
            l3_budget_ty, sell_through, penetration_ly, penetration_ty,
            l3_penetration_ly, l3_penetration_ty, margin_percentage,
            receipts_quantity_ty, cluster_code, cluster_display_name,
            optimization_level, carryover_flag, compare_type,
            new_l3_flag, is_active)
            SELECT 
                plan_code, hierarchy_code, season_code, channel, sub_channel,
                l3_budget_ty, sell_through, penetration_ly, penetration_ty,
                l3_penetration_ly, l3_penetration_ty, margin_percentage,
                receipts_quantity_ty, cluster_code, cluster_display_name,
                optimization_level, carryover_flag, compare_type,
                new_l3_flag, is_active
            FROM 
                temp_sp_opt_master_%s',
            timestamp_str
        );
            
        -- Minimal edit: deduplicate mapping to avoid duplicate attribute inserts (SP -> WP)
        EXECUTE format('
            WITH w_dedup AS (
                SELECT
                    plan_clu_opt_id,
                    plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code,
                    row_number() OVER (
                        PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code
                        ORDER BY plan_clu_opt_id
                    ) AS rn
                FROM assort_smart.plan_cluster_opt_master_wp
                WHERE plan_code = $1
            ),
            s_dedup AS (
                SELECT
                    plan_clu_opt_id,
                    plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code,
                    row_number() OVER (
                        PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code
                        ORDER BY plan_clu_opt_id
                    ) AS rn
                FROM temp_sp_opt_master_%s
            )
            INSERT INTO sp_id_mapping_%s (new_pcoid, old_pcoid)
            SELECT w.plan_clu_opt_id, s.plan_clu_opt_id
            FROM w_dedup w
            JOIN s_dedup s
              ON w.plan_code = s.plan_code
             AND w.hierarchy_code = s.hierarchy_code
             AND w.season_code = s.season_code
             AND w.channel = s.channel
             AND w.sub_channel = s.sub_channel
             AND w.cluster_code = s.cluster_code
             AND w.rn = s.rn',
            timestamp_str, timestamp_str
        ) USING sp_plan_code;
        
        -- Insert WP masters into SP
        EXECUTE format('
            INSERT INTO assort_smart.plan_cluster_opt_master_sp
            (plan_code, hierarchy_code, season_code, channel, sub_channel,
            l3_budget_ty, sell_through, penetration_ly, penetration_ty,
            l3_penetration_ly, l3_penetration_ty, margin_percentage,
            receipts_quantity_ty, cluster_code, cluster_display_name,
            optimization_level, carryover_flag, compare_type,
            new_l3_flag, is_active)
            SELECT 
                plan_code, hierarchy_code, season_code, channel, sub_channel,
                l3_budget_ty, sell_through, penetration_ly, penetration_ty,
                l3_penetration_ly, l3_penetration_ty, margin_percentage,
                receipts_quantity_ty, cluster_code, cluster_display_name,
                optimization_level, carryover_flag, compare_type,
                new_l3_flag, is_active
            FROM 
                temp_wp_opt_master_%s',
            timestamp_str
        );
        
        -- Minimal edit: deduplicate mapping to avoid duplicate attribute inserts (WP -> SP)
        EXECUTE format('
            WITH s_dedup AS (
                SELECT
                    plan_clu_opt_id,
                    plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code,
                    row_number() OVER (
                        PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code
                        ORDER BY plan_clu_opt_id
                    ) AS rn
                FROM assort_smart.plan_cluster_opt_master_sp
                WHERE plan_code = $1
            ),
            w_dedup AS (
                SELECT
                    plan_clu_opt_id,
                    plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code,
                    row_number() OVER (
                        PARTITION BY plan_code, hierarchy_code, season_code, channel, sub_channel, cluster_code
                        ORDER BY plan_clu_opt_id
                    ) AS rn
                FROM temp_wp_opt_master_%s
            )
            INSERT INTO wp_id_mapping_%s (new_pcoid, old_pcoid)
            SELECT s.plan_clu_opt_id, w.plan_clu_opt_id
            FROM s_dedup s
            JOIN w_dedup w
              ON s.plan_code = w.plan_code
             AND s.hierarchy_code = w.hierarchy_code
             AND s.season_code = w.season_code
             AND s.channel = w.channel
             AND s.sub_channel = w.sub_channel
             AND s.cluster_code = w.cluster_code
             AND s.rn = w.rn',
            timestamp_str, timestamp_str
        ) USING wp_plan_code;
        
        -- Insert attributes with updated foreign keys
        EXECUTE format('
            INSERT INTO assort_smart.plan_cluster_opt_attribute_wp
            (attribute_name, sub_attribute_name, sell_through, penetration_ly, 
            penetration_ty, total_quantity, margin_percentage, plan_clu_opt_id)
            SELECT 
                a.attribute_name, a.sub_attribute_name, a.sell_through, a.penetration_ly,
                a.penetration_ty, a.total_quantity, a.margin_percentage, m.new_pcoid
            FROM 
                sp_opt_attr_%s a
            JOIN 
                sp_id_mapping_%s m ON a.master_id = m.old_pcoid',
            timestamp_str, timestamp_str
        );
        
        EXECUTE format('
            INSERT INTO assort_smart.plan_cluster_opt_attribute_sp
            (attribute_name, sub_attribute_name, sell_through, penetration_ly, 
            penetration_ty, total_quantity, margin_percentage, plan_clu_opt_id)
            SELECT 
                a.attribute_name, a.sub_attribute_name, a.sell_through, a.penetration_ly,
                a.penetration_ty, a.total_quantity, a.margin_percentage, m.new_pcoid
            FROM 
                wp_opt_attr_%s a
            JOIN 
                wp_id_mapping_%s m ON a.master_id = m.old_pcoid',
            timestamp_str, timestamp_str
        );
            
        -- Clean up all temporary tables
        EXECUTE format('DROP TABLE IF EXISTS temp_sp_opt_master_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS temp_wp_opt_master_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS sp_id_map_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS wp_id_map_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS sp_opt_attr_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS wp_opt_attr_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS sp_id_mapping_%s', timestamp_str);
        EXECUTE format('DROP TABLE IF EXISTS wp_id_mapping_%s', timestamp_str);

        RAISE NOTICE 'Swap operation completed successfully.';
    END;
END;
$function$
;