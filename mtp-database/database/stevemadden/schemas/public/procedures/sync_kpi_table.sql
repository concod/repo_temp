--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_kpi_table runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:sm_sync_kpi_table
--comment: initial changeset for sync_kpi_table
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_kpi_table(IN _is_historic boolean);

CREATE OR REPLACE PROCEDURE public.sync_kpi_table (IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_kpi_table';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		if _is_historic then 
	 		select async_query into _worker from public.async_query('delete from inventory_smart.kpi_table where true;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 		end if;
		perform public.parellel_insert('WITH rows AS (
		  insert into inventory_smart.kpi_table (
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l4_name,
        s1_name,
        s2_name,
        channel,
        oh,
        oh_it,
        oh_oo_it,
        fwos,
        fwos_oh,
        fwos_oh_it,
        size_integrity,
        size_integrity_oh_it,
        size_integrity_oh_oo_it,
        product_group,
        store_group,
        store_code
			) 
			select 
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        l4_name,
        s1_name,
        s2_name,
        channel,
        oh,
        oh_it,
        oh_oo_it,
        fwos,
        fwos_oh,
        fwos_oh_it,
        size_integrity,
        size_integrity_oh_it,
        size_integrity_oh_oo_it,
        product_group,
        store_group,
        store_code
			from 
			  public.kpi_table {where} RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.kpi_table', 'l4_name', 'fc_kpi_l4_idx');
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
