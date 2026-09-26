--liquibase formatted sql
--changeset kamuju.mahaveer@impactanalytics.co:backup_maintainance_bkp_final runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-766
--comment: initial changeset for backup_maintainance backup
DROP PROCEDURE IF EXISTS public.backup_maintainance();
CREATE OR REPLACE PROCEDURE public.backup_maintainance()
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.backup_maintainance';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    table_name TEXT;
    partition_date DATE;
    formatted_date TEXT;
    full_partition_name TEXT;
    today DATE := CURRENT_DATE;
    cutoff_date DATE := today - INTERVAL '30 days';
    table_list TEXT[] := ARRAY[
        'rcl_dc_store_policy_rule', 'rcl_dc_store_policy', 'rcl_constraint_master_rule', 'rcl_constraint_master_exceptions',
        'rcl_constraint_master', 'dc_transfer_constraints', 'dc_store_policy_user_rule', 'dc_service_levels',
        'auto_allocation_scheduler', 'product_profile_user_mapping_size', 'product_profile_master', 'distribution_centres',
        'new_store_attributes', 'new_store_data', 'new_store_mapping', 'new_store_reserve','product_group_definitions',
        'product_group_definitions_rules_mapping', 'product_group_rules', 'product_groups', 'product_groups_mapping',
        'rcl_master', 'store_groups', 'store_groups_mapping'
    ];
    _query TEXT;
    tbl TEXT;
    min_date DATE;
    max_date DATE;
    cnt_min BIGINT;
    cnt_max BIGINT;
    cnt_live BIGINT;
    min_range_start DATE := today - INTERVAL '33 days';
    min_range_end DATE := today - INTERVAL '27 days';
    max_range_start DATE := today - INTERVAL '3 days';
    max_range_end DATE := today + INTERVAL '3 days';
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- 1. Create partitions for next 30 days
    FOR i IN 0..30 LOOP
        partition_date := today + i;
        formatted_date := TO_CHAR(partition_date, 'YYYYMMDD');

        FOREACH table_name IN ARRAY table_list LOOP
            BEGIN
				_query := format(
					'CREATE TABLE IF NOT EXISTS  data_retention.%I_%s
                    PARTITION OF data_retention.%I
                    FOR VALUES IN (''%s'')',
                    table_name, formatted_date, table_name, partition_date
                );
                EXECUTE _query;
                RAISE NOTICE 'Created partition: data_retention.%I_%', table_name, formatted_date ;
            END;
        END LOOP;
    END LOOP;

    -- 2. Drop partitions older than 30 days
    FOR i IN 32..62 LOOP 
        partition_date := today - i;
        formatted_date := TO_CHAR(partition_date, 'YYYYMMDD');

        FOREACH table_name IN ARRAY table_list LOOP
            BEGIN
                _query :=  format(
					'DROP TABLE IF EXISTS data_retention.%I_%s CASCADE',
                    table_name, formatted_date
                );
                EXECUTE _query;
				RAISE NOTICE 'Deleted partition: data_retention.%I_%s', table_name, formatted_date ;
            END;
        END LOOP;
    END LOOP;
   IF NOT EXISTS (SELECT 1 FROM data_retention.rcl_dc_store_policy_rule WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.rcl_dc_store_policy_rule (rule_code, rcl_code, rcl_dimension, rule_name, snapshot_date)
       SELECT rule_code, rcl_code, rcl_dimension, rule_name, CURRENT_DATE FROM inventory_smart.rcl_dc_store_policy_rule;
   END IF;
	--  2
   IF NOT EXISTS (SELECT 1 FROM data_retention.rcl_dc_store_policy WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.rcl_dc_store_policy (
           rcl_dc_store_policy_code, rcl_code, rule_code, default_store_groups, default_product_profile,
           dc_store_rule, auto_allocation_rule, auto_allocation_schedular, validity,
           created_at, updated_at, updated_by, created_by, is_deleted, snapshot_date
       )
       SELECT
           rcl_dc_store_policy_code, rcl_code, rule_code, default_store_groups, default_product_profile,
           dc_store_rule, auto_allocation_rule, auto_allocation_schedular, validity,
           created_at, updated_at, updated_by, created_by, is_deleted, CURRENT_DATE
       FROM inventory_smart.rcl_dc_store_policy;
   END IF;
	--  3
   IF NOT EXISTS (SELECT 1 FROM data_retention.rcl_constraint_master_rule WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.rcl_constraint_master_rule (rule_code, rcl_code, rcl_dimension, rule_name, snapshot_date)
       SELECT rule_code, rcl_code, rcl_dimension, rule_name, CURRENT_DATE
       FROM inventory_smart.rcl_constraint_master_rule;
   END IF;
   -- 4
   IF NOT EXISTS (SELECT 1 FROM data_retention.rcl_constraint_master_exceptions WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.rcl_constraint_master_exceptions (
           rcl_code, rule_code, validity, store_code, wos, transit_time, safety_stock,
           min_stock, max_stock, aps, ros, st, created_at, updated_at, updated_by,
           created_by, snapshot_date
       )
       SELECT rcl_code, rule_code, validity, store_code, wos, transit_time, safety_stock,
              min_stock, max_stock, aps, ros, st, created_at, updated_at, updated_by,
              created_by, CURRENT_DATE
       FROM inventory_smart.rcl_constraint_master_exceptions;
   END IF;
   -- 5
   IF NOT EXISTS (SELECT 1 FROM data_retention.rcl_constraint_master WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.rcl_constraint_master (
           rcl_code, rule_code, psa_code, psa_name, validity, wos, transit_time, safety_stock,
           min_stock, max_stock, aps, ros, st, created_at, updated_at, updated_by,
           created_by, rcl_constraint_code, is_deleted, snapshot_date
       )
       SELECT rcl_code, rule_code, psa_code, psa_name, validity, wos, transit_time, safety_stock,
              min_stock, max_stock, aps, ros, st, created_at, updated_at, updated_by,
              created_by, rcl_constraint_code, is_deleted, CURRENT_DATE
       FROM inventory_smart.rcl_constraint_master;
   END IF;
   -- 6
   IF NOT EXISTS (SELECT 1 FROM data_retention.dc_transfer_constraints WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.dc_transfer_constraints (
           hierarchy, source_dc, destination_dc, min_transfer_quantity, created_by, created_at,
           updated_by, updated_at, id, product_code, snapshot_date
       )
       SELECT hierarchy, source_dc, destination_dc, min_transfer_quantity, created_by, created_at,
              updated_by, updated_at, id, product_code, CURRENT_DATE
       FROM inventory_smart.dc_transfer_constraints;
   END IF; 
   -- 7
   IF NOT EXISTS (SELECT 1 FROM data_retention.dc_store_policy_user_rule WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.dc_store_policy_user_rule (
           rule_code, rule_name, values, rule_type, is_deleted, created_by, created_at,
           updated_by, updated_at, is_deletable, snapshot_date
       )
       SELECT rule_code, rule_name, values, rule_type, is_deleted, created_by, created_at,
              updated_by, updated_at, is_deletable, CURRENT_DATE
       FROM inventory_smart.dc_store_policy_user_rule;
   END IF;
    -- 8
    IF NOT EXISTS (SELECT 1 FROM data_retention.dc_service_levels WHERE snapshot_date = CURRENT_DATE) THEN
    execute 
        'INSERT INTO data_retention.dc_service_levels (
            hierarchy, dc, target_wos, min_stock, safety_stock_method, safety_stock_units,
            service_level_percentage, created_by, created_at, updated_by, updated_at,
            safety_stock_wos, id, product_code, snapshot_date
        )
        SELECT hierarchy, dc, target_wos, min_stock, safety_stock_method, safety_stock_units,
               service_level_percentage, created_by, created_at, updated_by, updated_at,
               safety_stock_wos, id, product_code, CURRENT_DATE
        FROM inventory_smart.dc_service_levels;';
   END IF;
    -- 9
   IF NOT EXISTS (SELECT 1 FROM data_retention.auto_allocation_scheduler WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.auto_allocation_scheduler (
           sh_code, sh_name, sh_structure, sh_frequency, is_deleted, created_by,
           created_at, updated_by, updated_at, is_deletable, snapshot_date
       )
       SELECT sh_code, sh_name, sh_structure, sh_frequency, is_deleted, created_by,
              created_at, updated_by, updated_at, is_deletable, CURRENT_DATE
       FROM inventory_smart.auto_allocation_scheduler;
   END IF;
   -- 10
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_profile_user_mapping_size WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_profile_user_mapping_size (
           pp_code, l0_name, size_level_proportion, overall_proportion, size, store_code, snapshot_date
       )
       SELECT pp_code, l0_name, size_level_proportion, overall_proportion, size, store_code, CURRENT_DATE
       FROM inventory_smart.product_profile_user_mapping_size;
   END IF;
   -- 11
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_profile_master WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_profile_master (
           pp_code, name, special_classification, is_deleted, created_at, updated_at,
           created_by, updated_by, ph_code, description, snapshot_date
       )
       SELECT pp_code, name, special_classification, is_deleted, created_at, updated_at,
              created_by, updated_by, ph_code, description, CURRENT_DATE
       FROM inventory_smart.product_profile_master;
   END IF;
   -- 12
   IF NOT EXISTS (SELECT 1 FROM data_retention.distribution_centres WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.distribution_centres (
           dc_code, name, is_active, created_by, updated_by, created_at, updated_at,
           is_deleted, lead_time, cost_per_km, linked_store_code, snapshot_date
       )
       SELECT dc_code, name, is_active, created_by, updated_by, created_at, updated_at,
              is_deleted, lead_time, cost_per_km, linked_store_code, CURRENT_DATE
       FROM "global".distribution_centres;
   END IF;
   -- 13
   IF NOT EXISTS (SELECT 1 FROM data_retention.new_store_attributes WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.new_store_attributes (
           store_code, opening_date, sister_store_mapping_date, store_group_mapping_date,
           store_groups, reservation_start_date, effective_date, temp_store_code,
           temp_opening_date, temp_legacy_store_mapping_date, temp_closing_date,
           temp_effective_date, legacy_store_code, legacy_closing_date, remodel_flag, snapshot_date
       )
       SELECT store_code, opening_date, sister_store_mapping_date, store_group_mapping_date,
              store_groups, reservation_start_date, effective_date, temp_store_code,
              temp_opening_date, temp_legacy_store_mapping_date, temp_closing_date,
              temp_effective_date, legacy_store_code, legacy_closing_date, remodel_flag, CURRENT_DATE
       FROM "global".new_store_attributes;
   END IF;
   -- 14
   IF NOT EXISTS (SELECT 1 FROM data_retention.new_store_data WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.new_store_data (
           store_code, store_name, remodel_flag, snapshot_date
       )
       SELECT store_code, store_name, remodel_flag, CURRENT_DATE
       FROM "global".new_store_data;
   END IF;
   -- 15
   IF NOT EXISTS (SELECT 1 FROM data_retention.new_store_mapping WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.new_store_mapping (
           store_code, sister_store_code, hierarchies, multiplier, temp_store_code,
           temp_hierarchies, temp_multiplier, remodel_flag, snapshot_date
       )
       SELECT store_code, sister_store_code, hierarchies, multiplier, temp_store_code,
              temp_hierarchies, temp_multiplier, remodel_flag, CURRENT_DATE
       FROM "global".new_store_mapping;
   END IF;
   -- 16
   IF NOT EXISTS (SELECT 1 FROM data_retention.new_store_reserve WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.new_store_reserve (
           store_code, product_code, size, article, opening_date, reservation_date, original_reserved,
           remaining_reserved, created_at, approved, created_by, sister_store_code, editable,
           sister_store_mapping_date, edit_details, store_group_mapping_date, store_groups,
           mapped, forecast_estimated, store_grade, wos, min_stock, max_stock, channel,
           mapping_code, approved_qty, released_qty, released, remodel_flag, downstream_flag, snapshot_date
       )
       SELECT store_code, product_code, size, article, opening_date, reservation_date, original_reserved,
              remaining_reserved, created_at, approved, created_by, sister_store_code, editable,
              sister_store_mapping_date, edit_details, store_group_mapping_date, store_groups,
              mapped, forecast_estimated, store_grade, wos, min_stock, max_stock, channel,
              mapping_code, approved_qty, released_qty, released, remodel_flag, downstream_flag, CURRENT_DATE
       FROM "global".new_store_reserve;
   END IF;
   -- 17
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_group_definitions WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_group_definitions (
           pgd_code, name, pseudo_code, is_deleted, created_at, updated_at,
           created_by, updated_by, snapshot_date
       )
       SELECT pgd_code, name, pseudo_code, is_deleted, created_at, updated_at,
              created_by, updated_by, CURRENT_DATE
       FROM "global".product_group_definitions;
   END IF;
   -- 18
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_group_definitions_rules_mapping WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_group_definitions_rules_mapping (
           pg_code, pgd_code, pgr_code, id, snapshot_date
       )
       SELECT pg_code, pgd_code, pgr_code, id, CURRENT_DATE
       FROM "global".product_group_definitions_rules_mapping;
   END IF;
   -- 19
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_group_rules WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_group_rules (
           pgr_code, name, attribute_name, attribute_values, is_deleted, created_at,
           updated_at, created_by, updated_by, snapshot_date
       )
       SELECT pgr_code, name, attribute_name, attribute_values, is_deleted, created_at,
              updated_at, created_by, updated_by, CURRENT_DATE
       FROM "global".product_group_rules;
   END IF;
   -- 20
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_groups WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_groups (
           pg_code, name, special_classification, is_deleted, created_at, updated_at,
           created_by, updated_by, selection_metadata, snapshot_date
       )
       SELECT pg_code, name, special_classification, is_deleted, created_at, updated_at,
              created_by, updated_by, selection_metadata, CURRENT_DATE
       FROM "global".product_groups;
   END IF;
   -- 21
   IF NOT EXISTS (SELECT 1 FROM data_retention.product_groups_mapping WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.product_groups_mapping (
           pg_code, product_code, ref_pg_code, avg_st_perc, rev_con_perc, snapshot_date
       )
       SELECT pg_code, product_code, ref_pg_code, avg_st_perc, rev_con_perc, CURRENT_DATE
       FROM "global".product_groups_mapping;
   END IF;
   -- 22
   IF NOT EXISTS (SELECT 1 FROM data_retention.rcl_master WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.rcl_master (
           rcl_code, module_code, level, hierarchy_selections, validity, priority,
           is_deleted, created_by, updated_by, created_at, updated_at,
           rcl_lowest_level, is_default, snapshot_date
       )
       SELECT rcl_code, module_code, level, hierarchy_selections, validity, priority,
              is_deleted, created_by, updated_by, created_at, updated_at,
              rcl_lowest_level, is_default, CURRENT_DATE
       FROM "global".rcl_master;
   END IF;
   -- 23
   IF NOT EXISTS (SELECT 1 FROM data_retention.store_groups WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.store_groups (
           sg_code, name, special_classification, is_deleted, created_at, updated_at,
           created_by, updated_by, channel, application_code, extra, is_default, snapshot_date
       )
       SELECT sg_code, name, special_classification, is_deleted, created_at, updated_at,
              created_by, updated_by, channel, application_code, extra, is_default, CURRENT_DATE
       FROM "global".store_groups;
   END IF;
   -- 24
   IF NOT EXISTS (SELECT 1 FROM data_retention.store_groups_mapping WHERE snapshot_date = CURRENT_DATE) THEN
       INSERT INTO data_retention.store_groups_mapping (
           sg_code, store_code, ref_sg_code, snapshot_date
       )
       SELECT sg_code, store_code, ref_sg_code, CURRENT_DATE
       FROM "global".store_groups_mapping;
   END IF;

    -- 3. Delete data older than 30 days
    FOREACH table_name IN ARRAY table_list LOOP
		EXECUTE format('DELETE FROM data_retention.%I WHERE snapshot_date < %L', table_name, cutoff_date);
    END LOOP;
    
    TRUNCATE TABLE data_retention.snapshot_check_log;

	FOREACH tbl IN ARRAY table_list LOOP
       -- Get min & max snapshot dates within narrow ranges
       EXECUTE format(
           'SELECT MIN(snapshot_date), MAX(snapshot_date)
            FROM data_retention.%I',
           tbl
       )
       INTO min_date, max_date;

       -- Row count at min snapshot date
       IF min_date IS NOT NULL THEN
           EXECUTE format(
               'SELECT COUNT(*) FROM data_retention.%I WHERE snapshot_date = %L',
               tbl, min_date
           ) INTO cnt_min;
       ELSE
           cnt_min := NULL;
       END IF;

       -- Row count at max snapshot date
       IF max_date IS NOT NULL THEN
           EXECUTE format(
               'SELECT COUNT(*) FROM data_retention.%I WHERE snapshot_date = %L',
               tbl, max_date
           ) INTO cnt_max;
       ELSE
           cnt_max := NULL;
       END IF;

       -- Live row count from source
       BEGIN
           IF tbl IN (
               'distribution_centres', 'new_store_attributes', 'new_store_data', 'new_store_mapping',
               'new_store_reserve', 'product_group_definitions', 'product_group_definitions_rules_mapping',
               'product_group_rules', 'product_groups', 'product_groups_mapping', 'rcl_master',
               'store_groups', 'store_groups_mapping'
           ) THEN
               EXECUTE format('SELECT COUNT(*) FROM "global".%I', tbl) INTO cnt_live;
           ELSE
               EXECUTE format('SELECT COUNT(*) FROM inventory_smart.%I', tbl) INTO cnt_live;
           END IF;
       EXCEPTION WHEN OTHERS THEN
           cnt_live := NULL;
        END;
        INSERT INTO data_retention.snapshot_check_log (table_name, min_snapshot_date, max_snapshot_date, cnt_min, cnt_max, cnt_live)
        VALUES (tbl, min_date, max_date, cnt_min, cnt_max, cnt_live);
    END LOOP;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$$;

