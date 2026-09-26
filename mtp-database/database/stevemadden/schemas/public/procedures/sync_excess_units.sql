--liquibase formatted sql
--changeset liquibase:sync_excess_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sm_sync_excess_units
--comment: initial changeset for sync_excess_units
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_excess_units();
DROP PROCEDURE IF EXISTS public.sync_excess_units(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_excess_units(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
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
		delete from 
		  inventory_smart.excess_units 
		where 
		  true;
 		end if;
		INSERT INTO inventory_smart.excess_units (
		  product_hierarchy, store_code, fiscal_year, 
		  fiscal_week, "date", oh, oo, it, 
		  ros, target_wos, wos_pred, excess_inv, 
		  excess_inv_cost, tot_inv,
		  --new column
		  week_qty
		) 
		SELECT 
		  product_code, 
		  store_code, 
		  fiscal_year, 
		  fiscal_week, 
		  "date", 
		  oh, 
		  oo, 
		  it, 
		  ros, 
		  target_wos, 
		  wos_predicted, 
		  excess_inv, 
		  excess_inv_cost, 
		  tot_inv,
		  --new column
		  units_sold
		FROM 
		  public.excess_units;
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
