--liquibase formatted sql
--changeset ashish@impactanalytics.co:build_product_store_mapping_schema runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for build_product_store_mapping_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.build_product_store_mapping_schema();
CREATE OR REPLACE PROCEDURE public.build_product_store_mapping_schema()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.build_product_store_mapping_schema';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_worker1 text;
 		_worker2 text;
 		_worker3 text;
 	begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	select async_query into _worker1 from public.async_query('perform global.create_drop_index_list_ingestion(''inventory_smart'', ''product_profile_mapping'', false);');
	 	select async_query into _worker2 from public.async_query('perform global.create_drop_index_list_ingestion(''inventory_smart'', ''constraint_master'', false);');
	 	select async_query into _worker3 from public.async_query('perform global.create_drop_index_list_ingestion(''global'', ''product_mapping_product_store'', false);');
		perform public.async_query_status(_worker1, 'cleanup');
		perform public.async_query_status(_worker2, 'cleanup');
		perform public.async_query_status(_worker3, 'cleanup');
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
