--liquibase formatted sql
--changeset pooja.shekar:added logic for active and inactive prepacks runOnChange:true stripComments:false splitStatements:false context:Ralph_Lauren_InventorySmart labels:MTP-67818
--comment: 	added logic for active and inactive prepacks
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_manage_material_status();
CREATE OR REPLACE PROCEDURE public.sync_manage_material_status()
LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_manage_material_status';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Step 1: Move materials with at least one inactive product code from dc_pack_inventory to dc_pack_inventory_inactive
    INSERT INTO dc_pack_inventory_inactive (product_code,article,dc_code,pack_type_id,pack_type,oh_pack_qty,oo_pack_qty,it_pack_qty,channel,size,stock_cat,sap_ean,sap_upc,sold_to_party,pack_type_id_og)
    SELECT DISTINCT product_code,article,dc_code,pack_type_id,pack_type,oh_pack_qty,oo_pack_qty,it_pack_qty,channel,size,stock_cat,sap_ean,sap_upc,sold_to_party,pack_type_id_og
    FROM "inventory_smart".dc_pack_inventory dpi
    WHERE dpi.article IN (
        SELECT p.article
        FROM "global".product_attributes_filter p
        GROUP BY p.article
        HAVING COUNT(*) FILTER (WHERE p.active = 'false') > 0
    );

    -- Delete the moved materials from dc_pack_inventory
    DELETE FROM "inventory_smart".dc_pack_inventory
    WHERE material_id IN (
        SELECT p.material_id
        FROM paf p
        GROUP BY p.material_id
        HAVING COUNT(*) FILTER (WHERE p.status = 'inactive') > 0
    );

    -- Step 2: Move materials back to dc_pack_inventory if all product codes are active
    INSERT INTO dc_pack_inventory (product_code,article,dc_code,pack_type_id,pack_type,oh_pack_qty,oo_pack_qty,it_pack_qty,channel,size,stock_cat,sap_ean,sap_upc,sold_to_party,pack_type_id_og)
    SELECT DISTINCT product_code,article,dc_code,pack_type_id,pack_type,oh_pack_qty,oo_pack_qty,it_pack_qty,channel,size,stock_cat,sap_ean,sap_upc,sold_to_party,pack_type_id_og
    FROM dc_pack_inventory_inactive dpii
    WHERE dpii.material_id NOT IN (
        SELECT p.material_id
        FROM paf p
        GROUP BY p.material_id
        HAVING COUNT(*) FILTER (WHERE p.status = 'inactive') = 0
    );

    -- Delete the moved materials from dc_pack_inventory_inactive
    DELETE FROM dc_pack_inventory_inactive
    WHERE material_id NOT IN (
        SELECT p.material_id
        FROM paf p
        GROUP BY p.material_id
        HAVING COUNT(*) FILTER (WHERE p.status = 'inactive') = 0
    );
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;


