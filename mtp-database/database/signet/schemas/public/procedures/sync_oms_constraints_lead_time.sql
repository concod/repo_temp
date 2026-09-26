--liquibase formatted sql
--changeset liquibase:sync_oms_constraints_lead_time runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_constraints_lead_time
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_constraints_lead_time(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_lead_time(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_lead_time';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_lead_time 
            where 
              true;
        end if;
  insert into inventory_smart.oms_constraints_lead_time
      (product_code,
       loc_code,
       vendor_code,
       lead_time,
       variance,
       created_by,
       created_at, 
       updated_by, 
       updated_at 
      )
  select
       product_code,
       loc_code,
       vendor_code,
       week_lead_time,--lead_time,
       coalesce(variance,0),
       3 as created_by,
       current_timestamp as created_at,
       null as updated_by ,
       null as updated_at
  from
    --public.oms_constraints_lead_time
    public.oms_constraints_vendor_lead_time
  where length(week_lead_time::varchar) <> 0
  on conflict ON CONSTRAINT pk_oms_constraints_lead_time do update 
  set
      lead_time = excluded.lead_time,
      variance = excluded.variance,
      updated_by = 3 ,
      updated_at = current_timestamp;
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
