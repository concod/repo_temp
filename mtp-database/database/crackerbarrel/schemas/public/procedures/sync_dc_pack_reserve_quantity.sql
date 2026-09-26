--liquibase formatted sql
--changeset aman.lakkoju:updated sync_dc_pack_reserve_quantity runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated sync_dc_pack_reserve_quantity
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dc_pack_reserve_quantity();
CREATE OR REPLACE PROCEDURE public.sync_dc_pack_reserve_quantity()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_reserve_quantity';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    -- Step 1: Delete non-reserved records
    DELETE FROM inventory_smart.dc_pack_reserve_quantity
    where reservation_till_date is null;

    -- Step 2: Insert new records or update existing ones on conflict
    INSERT INTO inventory_smart.dc_pack_reserve_quantity (
       pack_type_id, 
       quantity, 
       is_reserved,
       percentage,
       channel, 
       updated_at,
       reservation_till_date,
       created_at,
       instock_inclusion,
       updated_by,
       comment, 
       article,
       dc_code, 
       dc_name,
       type,
       incoming_po_30,
       incoming_po_31_60,
       incoming_po_61_90
    )
    SELECT 
       pack_id AS pack_type_id, 
       NULL AS quantity, 
       FALSE AS is_reserved,
       NULL AS percentage,
       channel, 
       NULL AS updated_at,
       NULL AS reservation_till_date,
       NULL AS created_at,
       FALSE AS instock_inclusion,
       NULL AS updated_by,
       NULL AS comment, 
       article,
       b.dc_code AS dc_code, 
       a.dc_code AS dc_name,
       NULL AS type,
       incoming_po_30,
       incoming_po_31_60,
       incoming_po_61_90 
    FROM public.dc_pack_reserve_quantity a
    JOIN "global".distribution_centres b
        ON a.dc_code = b.linked_store_code
    WHERE a.dc_code IS NOT NULL
    ON CONFLICT (pack_type_id, dc_code, article)
    DO UPDATE 
    SET 
       incoming_po_30 = EXCLUDED.incoming_po_30,
       incoming_po_31_60 = EXCLUDED.incoming_po_31_60,
       incoming_po_61_90 = EXCLUDED.incoming_po_61_90;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;