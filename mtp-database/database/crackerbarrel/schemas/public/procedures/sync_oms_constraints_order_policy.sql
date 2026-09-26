-- liquibase formatted sql
-- changeset zakia.firdous@impactanalytics.co:sync_oms_constraints_order_policy_cb_test runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_order_policy
-- comment: initial changeset for sync_oms_constraints_order_policy for cb test channel change


DROP PROCEDURE IF EXISTS public.sync_oms_constraints_order_policy();


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
INSERT INTO inventory_smart.oms_constraints_order_policy
	(article,
	loc_code, 
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
	column_updated)
SELECT 
	src.article, 
	loc_code, 
	src.channel, 
	src.vendor_code, 
	src.vendor_name, 
	src.replenishment_strategy, 
	src.scheduler, 
	src.order_strategy, 
	src.shipment_frequency, 
	src.created_by, 
	src.created_at, 
	src.updated_by, 
	src.updated_at, 
	src.column_updated
FROM public.oms_constraints_order_policy AS src
ON CONFLICT (article, loc_code, channel)
DO UPDATE 
SET 
	vendor_name=EXCLUDED.vendor_name,
	vendor_code=EXCLUDED.vendor_code,
	replenishment_strategy=EXCLUDED.replenishment_strategy,
	scheduler=EXCLUDED.scheduler,
	order_strategy=EXCLUDED.order_strategy, 
	shipment_frequency=EXCLUDED.shipment_frequency, 
	updated_by=EXCLUDED.updated_by, 
	updated_at=EXCLUDED.updated_at;
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
