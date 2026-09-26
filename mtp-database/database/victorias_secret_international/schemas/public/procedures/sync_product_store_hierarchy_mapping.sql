--liquibase formatted sql
--changeset liquibase:sync_product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_product_store_hierarchy_mapping
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping(bool);

CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  delete from "global".product_store_hierarchy_mapping 
  where true;
  insert into "global".product_store_hierarchy_mapping
  (
   l0_name ,
   l3_name ,
   channel 
  )
  select l0_name, l3_name, channel 
  from
  (
  	select l0_name , l3_name 
  	from "global".product_attributes_filter paf
  	where paf.active and paf.clearance=false and paf.discontinued_sku='0' and not paf.is_deleted
  	group by 1,2 
  ) t1
  cross join (
    select channel
  	from "global".store_attributes_filter saf
  	where saf.active and not saf.is_deleted
  	group by 1
  ) t2;
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
