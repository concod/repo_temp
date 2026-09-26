--liquibase formatted sql
--changeset navya.modepalli@impactanalytics.co:sync_preallocation_po_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-116934
--comment: Changeset for sync_preallocation_po_alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_preallocation_po_alerts();
CREATE OR REPLACE PROCEDURE public.sync_preallocation_po_alerts()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_preallocation_po_alerts';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from inventory_smart.preallocation_po_alerts
    where true;
    INSERT INTO inventory_smart.preallocation_po_alerts (po_number,
	po_delivery_date,
	ordered_quantity,
	received_qty,
	shipped_qty,
	available_qty_for_allocation,
	asn_id, dc_number,
	product_code,
	style_color_id,
	style_color_desc,
	grpdiv_name,
	div_name,
	dept_name,
	subdept_name,
	rtl_brand_desc,
	rtl_coordinate_group_desc,
	country_cd,
	product_description,
	l0_name,
 	l1_name,
	l2_name,
	l3_name,
	l4_name,
	brand,
	ph_code,
	channel,
	store_groups
)
    select po_number,
	po_delivery_date,
	ordered_quantity,
	received_qty,
	shipped_qty,
	available_qty_for_allocation,
	asn_id, dc_number,
	product_code,
	style_color_id,
	style_color_desc,
	grpdiv_name,
	div_name,
	dept_name,
	subdept_name,
	rtl_brand_desc,
	rtl_coordinate_group_desc,
	country_cd,
	product_description,
	l0_name,
 	l1_name,
	l2_name,
	l3_name,
	l4_name,
	brand,
	ph_code,
	channel,
	store_groups
    from public.po_alerts;
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