--liquibase formatted sql
--changeset suryasai.gopal@impactanalytics.co:sync_excess_units runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-22504
--comment: updated sync_excess_units to add few extra columns 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_excess_units();
DROP PROCEDURE IF EXISTS public.sync_excess_units(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_excess_units(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
-- SECURITY DEFINER
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_excess_units';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	if _is_historic then 
	 		select async_query into _worker from public.async_query('delete from 
	 		  inventory_smart.excess_units 
	 		where 
	 		  true;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
		end if;
		-- perform global.create_drop_index_list_ingestion('inventory_smart', 'excess_units', true);
		-- raise notice 'Step2: %', (clock_timestamp() - _st);
		perform public.parellel_insert('WITH rows AS (
			INSERT INTO inventory_smart.excess_units (
			  product_hierarchy, store_code, store_name, 
			  fiscal_year, fiscal_week, "date", 
			  oh, oo, it, week_qty, ros, target_wos, 
			  wos_pred, excess_inv, excess_inv_cost, 
			  tot_inv
			) 
			SELECT 
			  product_hierarchy, 
			  store_code, 
			  store_name, 
			  fiscal_year, 
			  fiscal_week, 
			  "date", 
			  oh, 
			  oo, 
			  it, 
			  week_qty, 
			  ros, 
			  target_wos, 
			  wos_pred, 
			  excess_inv, 
			  excess_inv_cost, 
			  tot_inv 
			FROM 
			  public.excess_units {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.excess_units', 'date', 'pexun_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 	end
$procedure$
;
