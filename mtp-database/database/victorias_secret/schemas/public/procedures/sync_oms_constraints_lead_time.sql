-- liquibase formatted sql
-- changeset kanishka.parashar@impactanalytics.co:id_column_update runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_constraints_lead_time
-- comment: initial changeset for sync_oms_constraints_lead_time_v2

DROP PROCEDURE IF EXISTS public.sync_oms_constraints_lead_time(bool);

CREATE OR REPLACE PROCEDURE public.sync_oms_constraints_lead_time(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_constraints_lead_time';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    -- NEW: Variable to hold the current highest ID
    _max_id int;
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	
	begin
        -- 1. Handle Historic Wipe first
        if _is_historic then
            delete from
              inventory_smart.oms_constraints_lead_time
            where
              true;
        end if;

        -- 2. NEW: Get the current Max ID (Must be done AFTER the delete logic above)
        -- If table is empty (historic run or first run), returns 0.
        -- If table has data (daily run), returns the highest existing ID.
        SELECT COALESCE(MAX(id), 0) INTO _max_id FROM inventory_smart.oms_constraints_lead_time;

        -- 3. Insert with Dynamic ID generation
        INSERT INTO inventory_smart.oms_constraints_lead_time
        (article,
        loc_code,
        channel,
        vendor_code,
        vendor_name,
        lead_time,
        po_to_order_processing,
        mode_shipment,
        manufacturing_lead_time,
        qc_time,
        fabric_lt,
        default_mode,
        from_date,
        to_date,
        created_by,
        created_at,
        updated_by,
        updated_at,
        column_updated,
        id -- <--- Added ID to insert list
        )
        SELECT
        article,
        loc_code,
        channel,
        '-' as vendor_code,
        '-' as vendor_name,
        lead_time,
        po_to_order_processing,
        mode_shipment,
        NULL AS manufacturing_lead_time,
        null as qc_time,
        fabric_lt,
        default_mode,
        from_date,
        to_date::date,
        created_by,
        created_at,
        NULL as updated_by,
        current_timestamp as updated_at,
        column_updated,
        -- NEW LOGIC: Max Existing ID + Rank of the new group
        (_max_id + DENSE_RANK() OVER (ORDER BY article, loc_code)) as id
        from
            public.oms_constraints_lead_time
        
        ON CONFLICT ON CONSTRAINT pk_oms_constraints_lead_time do update
        SET
        vendor_name=excluded.vendor_name,
        qc_time=excluded.qc_time,
        po_to_order_processing=excluded.po_to_order_processing,
        fabric_lt=excluded.fabric_lt,
        lead_time = excluded.lead_time,
        from_date=excluded.from_date::date,
        to_date=excluded.to_date::date,
        updated_by = NULL,
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