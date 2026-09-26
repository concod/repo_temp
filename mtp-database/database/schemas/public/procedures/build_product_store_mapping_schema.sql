--liquibase formatted sql
--changeset liquibase:build_product_store_mapping_schema runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_product_store_mapping_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.build_product_store_mapping_schema();
CREATE OR REPLACE PROCEDURE public.build_product_store_mapping_schema()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.build_product_store_mapping_schema';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_l0 varchar;
 	begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		drop table if exists public.product_mapping_product_store_tmp;
 		create table public.product_mapping_product_store_tmp as 
 		select 
 		  mapping_type, 
 		  product_code, 
 		  store_code, 
 		  is_active, 
 		  l0_name, 
 		  range_agg(
 		    daterange(
 		      validity_start_date, validity_end_date
 		    )
 		  ) as validity 
 		from 
 		  public.product_store_mapping x 
 		group by 
 		  1, 
 		  2, 
 		  3, 
 		  4, 
 		  5;
 		delete from inventory_smart.product_profile_master where special_classification = 'ia-recommended';
		delete from inventory_smart.constraint_master;
		update inventory_smart.product_profile_mapping set mapping_code = null, l0_name = null where mapping_code is not null;
--		delete from global.product_mapping_product_store;
		for _l0 in 
 		select 
 		  attribute_value 
 		from 
 		  global.product_attributes 
 		where 
 		  attribute_name = 'l0_name' 
 		group by 
 		  1 loop
 			delete from global.product_mapping_product_store where l0_name = _l0;
 			raise notice 'L0 %', _l0;
 			-- commit;
 		end loop;
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

