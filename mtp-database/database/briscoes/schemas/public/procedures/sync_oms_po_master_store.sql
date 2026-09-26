--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_oms_po_master_store runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_po_master
--comment: initial changeset sync_oms_po_master_store

DROP PROCEDURE IF EXISTS public.sync_oms_po_master_store();
CREATE OR REPLACE PROCEDURE public.sync_oms_po_master_store()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_po_master_store';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    DELETE FROM inventory_smart.oms_po_master_store
    WHERE TRUE;

    INSERT INTO inventory_smart.oms_po_master_store (
        order_id,
        po_id,
        asn_id,
        product_code,
        store_code,
        channel,
        projected_delivery_date,
        fiscal_year_week,
        oo,
        it,
        pseudo_po,
        quantity_ordered
    )
    SELECT 
        order_id,
        po_id,
        asn_id,
        product_code,
        store_code,
        channel,
        projected_delivery_date,
        fiscal_year_week,
        oo,
        it,
        pseudo_po,
        0 as quantity_ordered
    FROM public.oms_po_master_store x;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;