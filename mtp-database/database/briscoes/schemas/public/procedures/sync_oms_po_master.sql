--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:sync_oms_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1.1 labels:sync_oms_po_master
--comment: initial changeset sync_oms_po_master 

DROP PROCEDURE IF EXISTS public.sync_oms_po_master();
CREATE OR REPLACE PROCEDURE public.sync_oms_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_po_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM inventory_smart.oms_po_master
    WHERE TRUE;
    INSERT INTO inventory_smart.oms_po_master (
        order_id,
        po_id,
        asn_id,
        product_code,
        loc_code,
        channel,
        projected_delivery_date,
        fiscal_year_week,
        oo,
        it,
        pseudo_po,
        created_by,
        created_at,
        updated_by,
        updated_at,
        column_updated
    )
    SELECT DISTINCT
        order_id,
        po_id,
        asn_id,
        product_code,
        loc_code,
        channel,
        projected_delivery_date,
        fiscal_year_week,
        oo,
        it,
        pseudo_po,
        (select user_code from "global".user_master where email='ia_system@impactanalytics.co') as created_by,
        created_at,
        updated_by,
        updated_at,
        '-' as column_updated
    FROM
        public.oms_po_master x;

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
