--liquibase formatted sql
--changeset poojith.krishna@impactanalytics.co:sync_oms_constraints_order_policy runOnChange:true stripComments:false splitStatements:false context:Release_1_1 
--comment: adding procedure for sync_oms_constraints_order_policy

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_order_policy(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_order_policy(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_order_policy';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
   if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_order_policy 
            where 
              true;
        end if;
  insert into inventory_smart.oms_constraints_order_policy
      (
id,
article,
loc_code,
vendor_code,
vendor_name,
replenishment_strategy,
scheduler,
order_strategy,
shipment_frequency,
created_by,
created_at,
updated_by,
updated_at,
channel
      )
  select
id,    
article,
loc_code,
vendor_code,
vendor_name,
replenishment_strategy,
scheduler,
order_strategy,
shipment_frequency,
created_by,
created_at,
updated_by,
updated_at,
channel
  from
    --public.oms_kpi
    public.oms_constraints_order_policy
  on conflict ON CONSTRAINT pk_oms_constraints_order_policy do update 
  set
      replenishment_strategy = excluded.replenishment_strategy,
      order_strategy = excluded.order_strategy;

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


