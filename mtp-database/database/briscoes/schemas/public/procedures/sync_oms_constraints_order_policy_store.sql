--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_oms_constraints_order_policy_store runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_order_policy_store
--comment: initial changeset sync_oms_constraints_order_policy_store 

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_order_policy_store(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_order_policy_store(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_order_policy_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then 
            delete from 
              inventory_smart.oms_constraints_order_policy_store 
            where 
              true;
        end if;
INSERT INTO inventory_smart.oms_constraints_order_policy_store
	(article,
store_code,
channel,
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
column_updated,
id)
SELECT 
	article,
store_code,
channel,
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
column_updated,
id
FROM public.oms_constraints_order_policy_store AS src
ON CONFLICT (article, store_code, channel, vendor_code)
DO UPDATE 
SET 
	vendor_name=EXCLUDED.vendor_name,
	replenishment_strategy=EXCLUDED.replenishment_strategy,
	scheduler=EXCLUDED.scheduler,
	order_strategy=EXCLUDED.order_strategy, 
	shipment_frequency=EXCLUDED.shipment_frequency, 
    updated_by = (select user_code from "global".user_master where email='ia_system@impactanalytics.co'),
    updated_at = current_timestamp,
	column_updated=excluded.column_updated	
WHERE 
    inventory_smart.oms_constraints_order_policy_store.vendor_name IS DISTINCT FROM excluded.vendor_name OR
    inventory_smart.oms_constraints_order_policy_store.replenishment_strategy IS DISTINCT FROM excluded.replenishment_strategy OR
    inventory_smart.oms_constraints_order_policy_store.scheduler IS DISTINCT FROM excluded.scheduler OR
    inventory_smart.oms_constraints_order_policy_store.order_strategy IS DISTINCT FROM excluded.order_strategy OR
    inventory_smart.oms_constraints_order_policy_store.shipment_frequency IS DISTINCT FROM excluded.shipment_frequency;
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
