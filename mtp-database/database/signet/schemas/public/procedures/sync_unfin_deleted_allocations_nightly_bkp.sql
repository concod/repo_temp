--liquibase formatted sql
--changeset himansh.bhardwaj@impactanalytics.co::sync_unfin_deleted_allocations_nightly_bkp version 1.0 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels
--comment: sync_unfin_deleted_allocations_nightly_bkp delete for older allocations more than 1 day 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_unfin_deleted_allocations_nightly_bkp();
CREATE OR REPLACE PROCEDURE public.sync_unfin_deleted_allocations_nightly_bkp()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_unfin_deleted_allocations_nightly_bkp';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
        _table_name TEXT;
        _time_date TEXT;
        _sql_insert_query TEXT;
        _sql_delete_query TEXT;
        _sql_update_query TEXT;
   BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    _time_date := to_char(now() - interval '1 DAY', 'YYYYMMDD');
    _table_name := 'inventory_smart.unfin_deleted_allocations_nightly_bkp';
    _sql_insert_query := '
		INSERT INTO '|| _table_name ||' (article, "style", style_description, color, color_code, retail_size_cd, inv_avai, inventory_source, store, demand_type, demand, size_curve, split_profile, ros, min, oh, oo, it, oh_oo_intransit, min_unfulfilled, max_orig, max, wos, wk_count_final, allocated_total, allocation_code, created_by, created_at, updated_by, updated_at, special_classification, status, is_deleted, final_inv_available, aps, description, "order", new_size, created_by_username, updated_by_username, dc_codes, shipping_date, pack_dc_allocation, store_grade, store_name, "source", auto_allocation_run_flag, product_profile_selected, selected_store_groups, selected_store_group_names, selected_store_count, case_qty, allocated_total_orig, is_edited, pack_dc_allocation_original, order_type, delivery_dt, sub_sku, original_forecast, constrained_forecast, max_supression_flag, lt_forecast, updated_oh_oo_it, min_influenced_allocation, unedited_wos, unedited_min, unedited_max, selected_store_codes)
		SELECT article, "style", style_description, color, color_code, retail_size_cd, inv_avai, inventory_source, store, demand_type, demand, size_curve, split_profile, ros, min, oh, oo, it, oh_oo_intransit, min_unfulfilled, max_orig, max, wos, wk_count_final, allocated_total, allocation_code, created_by, created_at, updated_by, updated_at, special_classification, status, is_deleted, final_inv_available, aps, description, "order", new_size, created_by_username, updated_by_username, dc_codes, shipping_date, pack_dc_allocation, store_grade, store_name, "source", auto_allocation_run_flag, product_profile_selected, selected_store_groups, selected_store_group_names, selected_store_count, case_qty, allocated_total_orig, is_edited, pack_dc_allocation_original, order_type, delivery_dt, sub_sku, original_forecast, constrained_forecast, max_supression_flag, lt_forecast, updated_oh_oo_it, min_influenced_allocation, unedited_wos, unedited_min, unedited_max, selected_store_codes
    FROM inventory_smart.create_allocation_result_flat_gurobi_'||_time_date ||'
		WHERE 
		  allocation_code IN (
			SELECT 
			  plan_code 
			FROM 
			  inventory_smart.plan_master 
			WHERE 
			  status != 3 
			  AND created_at::date in (current_date - 1,current_date)
		  )';
     _sql_delete_query := '
     DELETE FROM 
		  inventory_smart.create_allocation_result_flat_gurobi_'||_time_date ||'
		WHERE 
		  allocation_code IN (
			SELECT 
			  plan_code 
			FROM 
			  inventory_smart.plan_master 
			WHERE 
			  status != 3 
			  AND created_at::date in (current_date - 1,current_date)
		  )'; 
     _sql_update_query := '
	     UPDATE inventory_smart.plan_master
         SET is_deleted = TRUE
         WHERE plan_code IN ( 
               SELECT DISTINCT allocation_code FROM inventory_smart.unfin_deleted_allocations_nightly_bkp 
               WHERE syncstartdatetime IN (current_date-1, current_date) )
     ';

     RAISE NOTICE 'Executing insert query for udanb: %', _sql_insert_query;
     RAISE NOTICE 'Executing delete query for carfg: %', _sql_delete_query;
     RAISE NOTICE 'Executing update query for plan_master : %',_sql_update_query;

     EXECUTE _sql_insert_query;
     EXECUTE _sql_delete_query;
     EXECUTE _sql_update_query;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;