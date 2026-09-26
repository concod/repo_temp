--liquibase formatted sql
--changeset swapnil.bhange:sync_product_store_hierarchy_mapping_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:0080
--comment: updated l0_stauts and allocation_status_flag column in SP 
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();
DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping(IN _is_historic boolean);
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
    if _is_historic then 
            delete from "global".product_store_hierarchy_mapping 
  where true;
  end if;
  insert into "global".product_store_hierarchy_mapping
     (
      l0_name ,
      l1_name ,
      l3_name ,
      l4_name ,
      psa_name,
      l0_status,
  	  allocation_status_flag
     )
  select
      a.l0_name ,
      a.l1_name ,
      a.l3_name ,
      a.l4_name ,
      a.psa_name,
      b.l0_status,
  	  b.allocation_status_flag
  from
    public.product_store_hierarchy_mapping a
  left join (select l0_name, l0_status, allocation_status_flag from "global".product_attributes_filter
where not is_deleted 
group by 1,2,3) b using (l0_name)
   ;
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