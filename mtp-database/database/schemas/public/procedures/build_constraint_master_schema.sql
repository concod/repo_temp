--liquibase formatted sql
--changeset liquibase:build_constraint_master_schema runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for build_constraint_master_schema
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.build_constraint_schema();
CREATE OR REPLACE PROCEDURE public.build_constraint_schema()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.build_constraint_schema';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_l0 varchar;
 	begin 
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		drop table if exists public.constraint_master_tmp;
 		create table public.constraint_master_tmp
 	   as SELECT 
 	   	  pmps.mapping_code, 
 		  pmps.l0_name,
 		  channel, 
 		  product_code, 
 		  store_code, 
 		  wos, 
 		  transit_time, 
 		  safety_stock, 
 		  (case when min_stock is null then 0 else min_stock end) as min_stock, 
 		  (case when max_stock is null then 0 else max_stock end) as max_stock, 
 		  aps, 
 		  ros 
 		FROM 
 		  public.constraint_master x 
 		  left join global.product_mapping_product_store pmps using(product_code, store_code);
		delete from inventory_smart.constraint_master where true;
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
