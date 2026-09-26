--liquibase formatted sql
--changeset liquibase:backsync updates for sync_oms_constraints_order_policy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-35860
--comment: backsync updates for  sync_oms_constraints_order_policy
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_oms_constraints_order_policy(IN _is_historic boolean);
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
      (product_code,
       replenishment_strategy,
       order_cycle,
       lot_sizing_strategy,
       wos,
       created_by,
       created_at, 
       updated_by, 
       updated_at 
      )
  select
       product_code,
       replenishment_strategy,
       order_cycle :: jsonb ,
       lot_sizing_strategy,
       wos,
       3 as created_by,
       current_timestamp as created_at,
       updated_by ,
       updated_at::timestamp
  from
    public.oms_constraints_order_policy
  on conflict ON CONSTRAINT pk_oms_constraints_order_policy do update 
  set order_cycle = excluded.order_cycle,
      lot_sizing_strategy = excluded.lot_sizing_strategy,
      updated_by = excluded.updated_by ,
      updated_at = excluded.updated_at;
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

