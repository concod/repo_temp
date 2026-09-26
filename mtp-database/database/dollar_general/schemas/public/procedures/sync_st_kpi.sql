--liquibase formatted sql
--changeset swapnil.bhange_3:sync_st_kpi_sp_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0073
--comment: added new columns for st_kpi_sp 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_st_kpi(IN _is_historic boolean);
DROP PROCEDURE IF EXISTS public.sync_st_kpi();
CREATE OR REPLACE PROCEDURE public.sync_st_kpi(IN _is_historic boolean DEFAULT false) 
LANGUAGE plpgsql 
-- SECURITY DEFINER 
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_st_kpi';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
	 		select async_query into _worker from public.async_query('DELETE FROM inventory_smart.st_kpi WHERE TRUE;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 		end if;
		perform public.parellel_insert( 'WITH rows AS (
			insert into inventory_smart.st_kpi (
			    l0_code,
			    l0_name,
			    l1_name,
			    l3_name,
			    l4_name,
			    hierarchy,
				product_code,
			    primary_sku,
				qty,
				carry_inv
			    )
			SELECT
			    l0_code,
			    l0_name,
			    l1_name,
			    l3_name,
			    l4_name,
			    hierarchy,
				product_code,
			    primary_sku,
				qty,
				carry_inv
			FROM public.st_kpi {where} RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.st_kpi', 'l4_name', 'st_kpi_l4_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$
;