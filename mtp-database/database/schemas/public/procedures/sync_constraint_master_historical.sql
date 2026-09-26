--liquibase formatted sql
--changeset liquibase:sync_constraint_master_historical runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_constraint_master_historical
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_constraint_master_historical();
CREATE OR REPLACE PROCEDURE public.sync_constraint_master_historical()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_constraint_master_historical';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 		_l0 varchar;
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	call public.build_constraint_schema();
	 	-- cleanup data of cons
	 	commit;
	 	raise notice '%', 'a';
 		---Create list of non-unique indexes to drop and create index using index_drop_create table
 		perform global.create_drop_index_list_ingestion('inventory_smart',  'constraint_master', true);
      	commit;
      	raise notice '%', 'b';
	 	call global.build_list_partitions('constraint_master');
	 	raise notice '%', 'c';
	 for _l0 in 
 		select 
 		  attribute_value 
 		from 
 		  global.product_attributes 
 		where 
 		  attribute_name = 'l0_name' 
 		group by 
 		  1 loop
 			insert into inventory_smart.constraint_master (
 			  mapping_code, l0_name, channel, product_code, 
 			  store_code, wos, transit_time, safety_stock, 
 			  min_stock, max_stock, aps, ros
 			) 
 			select 
 			  mapping_code, 
 			  l0_name, 
 			  channel, 
 			  product_code, 
 			  store_code, 
 			  wos, 
 			  transit_time, 
 			  safety_stock, 
 			  min_stock, 
 			  max_stock, 
 			  aps, 
 			  ros 
 			from 
 			  public.constraint_master_tmp x 
 			where 
 			  l0_name = _l0;
 		 	raise notice 'L0 %', _l0;
 		 	-- commit;
 		 end loop;
 		raise notice '%', 'd';
     	perform global.create_drop_index_list_ingestion('inventory_smart',  'constraint_master', false);
     	commit;
     	raise notice '%', 'e';
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
 	end
$procedure$;
