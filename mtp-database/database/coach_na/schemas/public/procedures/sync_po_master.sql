--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_po_master runOnChange:true stripComments:false splitStatements:false context:sync_po_master labels:first commit
--comment: sync_po_master
--rollback: SELECT 1




DROP PROCEDURE IF EXISTS public.sync_po_master();

CREATE OR REPLACE PROCEDURE public.sync_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Clear existing data
    TRUNCATE TABLE inventory_smart.po_master;
    
    -- Insert data with proper mapping to target columns
INSERT INTO inventory_smart.po_master (
    allocation_code,
    channel,
    company_code,
    document_date,
    inventory_date,
    item,
    po_code,
    product_code,
    purchase_group,
    quantity,
    requirement_date,
    status,
    target_quantity,
    validity_period_start,
    vendor_id,
    vendor_name,
    ecom_sales,lw_sales,dc_code,pack_type_id,allocated_qty,available_qty,article,article_orig
)
SELECT
    x.allocation_code,
    x.channel,
    x.company_code,
    x.document_date,
    x.inventory_date,
    x.item,
    x.po_code,
    x.product_code,
    x.purchase_group,
    x.quantity,
    x.requirement_date,
    x.status,
    x.target_quantity,
    x.validity_period_start,
    x.vendor_id,
    x.vendor_name,x.ecom_sales,x.lw_sales,x.dc_code,x.product_code,0,x.quantity,x.article,x.article_orig
FROM public.po_master x;

        
    RAISE NOTICE 'Successfully synced Po Master data';
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
