--liquibase formatted sql
--changeset kirubasahari.n:sync_po_alerts runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:RLIS-878
--comment: Changeset for sync_po_alerts
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_po_alerts();
CREATE OR REPLACE PROCEDURE public.sync_po_alerts()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_alerts';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from inventory_smart.po_alerts 
    where true;
    INSERT INTO inventory_smart.po_alerts (raw_po_code,po_code, article, product_description, style_color_id, l0_name, l1_name, l2_name,
    l3_name, l4_name, dtc_year, pfs_year, dtc_season, pfs_season, brand, anticipate_date, available_qty, 
    dest_whouse, po_type ,channel, source_code, rtl_coordinate_group_desc,product_group) 
    
    select concat(po_code,'-',dest_whouse),po_code, article, product_description, style_color_id, l0_name, l1_name, l2_name,
    l3_name, l4_name, dtc_year, pfs_year, dtc_season, pfs_season, brand, anticipate_date, available_qty, 
    dest_whouse, po_type,
    'PFS',
    source_code, rtl_coordinate_group_desc,product_group
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

