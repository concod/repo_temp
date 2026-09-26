--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:sync_oms_constraints_lead_time_store runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_lead_time_store
--comment: initial changeset sync_oms_constraints_lead_time_store 

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_lead_time_store(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_lead_time_store(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_lead_time_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  if _is_historic then
            delete from
              inventory_smart.oms_constraints_lead_time_store
            where
              true;
        end if;
       
-- Step 2: Deduplicate to keep only latest record per article, store_code, channel
DELETE FROM inventory_smart.oms_constraints_lead_time_store
WHERE ctid IN (
  SELECT ctid
  FROM (
    SELECT ctid,
           ROW_NUMBER() OVER (PARTITION BY article, store_code, channel ORDER BY updated_at DESC) AS rnk
    FROM inventory_smart.oms_constraints_lead_time_store
  ) sub
  WHERE rnk > 1
);


  -- Step 3: Remove records where vendor_code has changed for (article, store_code, channel)
  DELETE FROM inventory_smart.oms_constraints_lead_time_store tgt
  USING (
    SELECT DISTINCT ON (article, store_code, channel)
           article, store_code, channel, vendor_code
    FROM public.oms_constraints_lead_time_store
    ORDER BY article, store_code, channel, updated_at DESC
  ) src
  WHERE tgt.article = src.article
    AND tgt.store_code = src.store_code
    AND tgt.channel = src.channel
    AND tgt.vendor_code <> src.vendor_code;


       
INSERT INTO inventory_smart.oms_constraints_lead_time_store
  (article,
  store_code,
  channel,
  vendor_code,
  vendor_name,
  po_to_order_processing,
  lead_time,
  shipping_lead_time,
  qc_time,
  mode_shipment,
--  manufacturing_lead_time,
--  fabric_lt,
  default_mode,
  from_date,
  to_date,
  created_by,
  created_at,
  updated_by,
  updated_at,
  column_updated,
  category
  )
SELECT
  article,
  store_code,
  channel,
  vendor_code,
  vendor_name,
  po_to_order_processing,
  lead_time,
  shipping_lead_time,
  qc_time,
  mode_shipment,
--  NULL AS manufacturing_lead_time,
--  fabric_lt,
  default_mode,
  from_date,
  to_date::date,
  (select user_code from "global".user_master where email='ia_system@impactanalytics.co') as created_by,
  created_at,
  (select user_code from "global".user_master where email='ia_system@impactanalytics.co') as updated_by,
  current_timestamp as updated_at,
  '-' as column_updated,
  category
from public.oms_constraints_lead_time_store
ON CONFLICT (article, store_code, channel, vendor_code)
do update
SET
    vendor_name = excluded.vendor_name,
    po_to_order_processing = excluded.po_to_order_processing,
    lead_time = excluded.lead_time,
    shipping_lead_time = excluded.shipping_lead_time,
    qc_time = excluded.qc_time,
    mode_shipment = excluded.mode_shipment,
    default_mode = excluded.default_mode,
    from_date = excluded.from_date::date,
    to_date = excluded.to_date::date,
    updated_by = (select user_code from "global".user_master where email='ia_system@impactanalytics.co'),
    updated_at = current_timestamp,
    column_updated = excluded.column_updated
WHERE
    inventory_smart.oms_constraints_lead_time_store.vendor_name IS DISTINCT FROM excluded.vendor_name OR
    inventory_smart.oms_constraints_lead_time_store.po_to_order_processing IS DISTINCT FROM excluded.po_to_order_processing OR
    inventory_smart.oms_constraints_lead_time_store.lead_time IS DISTINCT FROM excluded.lead_time OR
    inventory_smart.oms_constraints_lead_time_store.shipping_lead_time IS DISTINCT FROM excluded.shipping_lead_time OR
    inventory_smart.oms_constraints_lead_time_store.qc_time IS DISTINCT FROM excluded.qc_time OR
    inventory_smart.oms_constraints_lead_time_store.mode_shipment IS DISTINCT FROM excluded.mode_shipment OR
    inventory_smart.oms_constraints_lead_time_store.default_mode IS DISTINCT FROM excluded.default_mode OR
    inventory_smart.oms_constraints_lead_time_store.from_date IS DISTINCT FROM excluded.from_date OR
    inventory_smart.oms_constraints_lead_time_store.to_date IS DISTINCT FROM excluded.to_date;
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
