--liquibase formatted sql
--changeset manas. malik@impactanalytics.co:sync_dc_pack_inventory_coach_na runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:coach_na_sync_dc_pack_inventory
--comment: initial changeset for sync_dc_pack_inventory for Coach NA
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_dc_pack_inventory();

CREATE OR REPLACE PROCEDURE public.sync_dc_pack_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_pack_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM inventory_smart.dc_pack_inventory WHERE TRUE;

    INSERT INTO inventory_smart.dc_pack_inventory (
        article, dc_code, pack_type_id, 
        pack_type, oh_pack_qty, oo_pack_qty, 
        it_pack_qty, size, channel
    )
    SELECT
        article,
        saf.dc_code AS dc_code,
        pack_type_id,
        pack_type,
        oh_pack_qty,
        oo_pack_qty,
        it_pack_qty,
        li.size,
        li.channel
    FROM
        public.dc_pack_inv li
        LEFT JOIN global.store_attributes_filter saf
            ON li.store_code = saf.store_code
    WHERE
        saf.special_classification = 'WHS';

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;