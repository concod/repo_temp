--liquibase formatted sql
--changeset ashish@impactanalytics.co::delete_create_allocation_result_flat_gurobi_old_autoallcoations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels
--comment: delete_create_allocation_result_flat_gurobi_old_autoallcoations delete for older allocations more than 7 days 
--comment: Technically disabling this process as same will handel in data retension code weekly
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.delete_create_allocation_result_flat_gurobi_old_autoallcoations();
CREATE OR REPLACE PROCEDURE public.delete_create_allocation_result_flat_gurobi_old_autoallcoations()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.delete_create_allocation_result_flat_gurobi_old_autoallcoations';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
--        _table_name TEXT;
--        _sql_insert_query TEXT;
   BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
--    _table_name := 'inventory_smart.create_allocation_result_flat_gurobi_bkp_' || to_char(now(), 'YYYYMMDDHH24MISS');
--    _sql_insert_query := '
--		CREATE TABLE ' || _table_name || ' AS 
--		SELECT 
--		  * 
--		FROM 
--		  inventory_smart.create_allocation_result_flat_gurobi 
--		WHERE 
--		  allocation_code IN (
--			SELECT 
--			  plan_code 
--			FROM 
--			  inventory_smart.plan_master 
--			WHERE 
--			  status != 3 
--			  AND created_at::date < current_date-7
--		  )';
--    EXECUTE _sql_insert_query;
--    delete from 
--	  inventory_smart.create_allocation_result_flat_gurobi carfg 
--	where 
--	  allocation_code in (
--		select 
--		  plan_code 
--		from 
--		  inventory_smart.plan_master 
--		where 
--		  status != 3 
--		  and created_at::date < current_date - 7
--	  );
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;
