--liquibase formatted sql
--changeset ashish@impactanalytics.co:cleanup_product_store_mapping_schema runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for cleanup_product_store_mapping_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.cleanup_product_store_mapping_schema();
CREATE OR REPLACE PROCEDURE public.cleanup_product_store_mapping_schema()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.cleanup_product_store_mapping_schema';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	_worker text;
 	begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	_st := clock_timestamp();

	 	select async_query into _worker from public.async_query('delete from 
 		  inventory_smart.product_profile_master 
 		where 
 		  special_classification = ''ia-recommended'';');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 1.1: %', (clock_timestamp() - _st);

		perform global.create_drop_index_list_ingestion('inventory_smart', 'product_profile_mapping', true);
	 	perform global.create_drop_index_list_ingestion('inventory_smart', 'constraint_master', true);
	 	raise notice '	Step 1.2: %', (clock_timestamp() - _st);
	 	
	 	select async_query into _worker from public.async_query('delete from 
 		  inventory_smart.constraint_master 
 		where 
 		  true;');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 1.3: %', (clock_timestamp() - _st);
		
		select async_query into _worker from public.async_query('update
			inventory_smart.product_profile_mapping
		set
			mapping_code = null,
			l0_name = null
		where
			mapping_code is not null;');
		perform public.async_query_status(_worker, 'cleanup');
		perform global.create_drop_index_list_ingestion('global', 'product_mapping_product_store', true);
		raise notice '	Step 1.4: %', (clock_timestamp() - _st);
		
		select async_query into _worker from public.async_query('delete
		from
			global.product_mapping_product_store
		where
			true;');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 1.5: %', (clock_timestamp() - _st);
		
		select async_query into _worker from public.async_query('call global.build_list_partitions(''product_mapping_product_store'');');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 1.6: %', (clock_timestamp() - _st);
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
