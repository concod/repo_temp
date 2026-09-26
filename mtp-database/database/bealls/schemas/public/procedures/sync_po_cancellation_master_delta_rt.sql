--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_latest_inventory runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:custom_sync_latest_inventory
--comment: creating sp for sync_po_cancellation_master_delta_rt


DROP PROCEDURE IF EXISTS public.sync_po_cancellation_master_delta_rt();

CREATE OR REPLACE PROCEDURE public.sync_po_cancellation_master_delta_rt()
 LANGUAGE plpgsql
AS $procedure$
	declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_cancellation_master_delta_rt';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  CREATE TEMP TABLE _cancel_keys (
    po_id varchar NOT NULL,
    receipt_id varchar NULL
  ) ON COMMIT DROP;

  INSERT INTO _cancel_keys (po_id, receipt_id)
  SELECT DISTINCT d.po_id, d.receipt_id
  FROM public.po_cancellation_delta_table_rt d
  WHERE d.po_id IS NOT NULL AND cancellation_flag is true;

  CREATE INDEX ON _cancel_keys (po_id, receipt_id);

  INSERT INTO inventory_smart.cancelled_po
  SELECT pm.*, now(), now()
  FROM inventory_smart.po_master pm
  WHERE EXISTS (
    SELECT 1
    FROM _cancel_keys k
    WHERE k.po_id = pm.po_id
      AND (k.receipt_id IS NULL OR k.receipt_id = pm.receipt_id)
  );

  DELETE FROM inventory_smart.po_master pm
  WHERE EXISTS (
    SELECT 1
    FROM _cancel_keys k
    WHERE k.po_id = pm.po_id
      AND (k.receipt_id IS NULL OR k.receipt_id = pm.receipt_id)
  );

  DELETE FROM inventory_smart.po_master_errored pe
  USING _cancel_keys k
  WHERE k.po_id = pe.po_id
    AND (k.receipt_id IS NULL OR k.receipt_id = pe.receipt_id);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;