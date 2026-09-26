-- liquibase formatted sql
-- changeset shreyansh.shreyansh@impactanalytics.co:sync_oms_constraints_order_policy_id_add runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_order_policy
-- comment: sync_oms_constraints_order_policy_id_add

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
INSERT INTO inventory_smart.oms_constraints_order_policy
  (article,
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
  column_updated,
  id
  )
SELECT
  src.article,
  src.loc_code,
  '-' as vendor_code,
  '-' as vendor_name,
  src.replenishment_strategy,
  src.scheduler,
  src.order_strategy,
  src.shipment_frequency,
  src.created_by,
  src.created_at,
  NULL AS updated_by,
  current_timestamp AS updated_at,
  src.column_updated,
  id
FROM public.oms_constraints_order_policy AS src
ON CONFLICT (article, loc_code, vendor_code)
DO UPDATE
SET
  vendor_name=EXCLUDED.vendor_name,
  replenishment_strategy=EXCLUDED.replenishment_strategy,
  scheduler=EXCLUDED.scheduler,
  order_strategy=EXCLUDED.order_strategy,
  shipment_frequency=EXCLUDED.shipment_frequency,
  updated_by=NULL,
  updated_at=current_timestamp;
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