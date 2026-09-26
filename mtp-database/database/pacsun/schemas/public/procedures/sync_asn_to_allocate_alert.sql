--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_asn_to_allocate_alert_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sync_asn_to_allocate_alert 
--rollback: SELECT 1
DROP PROCEDURE if exists public.sync_asn_to_allocate_alert();

CREATE OR REPLACE PROCEDURE public.sync_asn_to_allocate_alert()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_asn_to_allocate_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Delete all data from the target table
    DELETE FROM inventory_smart.asn_to_allocate_alert;
    
    -- Insert data from the source table with product attributes
    INSERT INTO inventory_smart.asn_to_allocate_alert (
        asn_id,
        article,
        l0_name,
        l1_name,
        l2_name,
        l3_id_name,
        brand,
        l3_name,
        l4_name,
        handling_type,
        fit,
        ladder,
        sizes_mat,
        oh,
        oo,
        it,
        receiver_number,
        pack_id,
        asn_qty,
        sizes_count,
        oh_dc,
        forecast_over_target_wos,
        delivery_date,
        vi_date,
        store_count_asn,
        store_count_choice,
        ata_is_resolved,
        at_is_resolved,
        active_asn_flag,
        style_color_description
    )
    SELECT DISTINCT
        ata.asn_id,
        ata.article,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_id_name,
        max(paf.brand) as brand,
        paf.l3_name,
        paf.l4_name,
        ata.handling_type,
        paf.fit,
        paf.ladder,
        ata.sizes_mat,
        ata.oh,
        ata.oo,
        ata.it,
        ata.receiver_number,
        ata.pack_type_id,
        ata.asn_qty,
        ata.sizes_count,
        ata.oh_dc,
        ata.forecast_over_target_wos,
        ata.delivery_date,
        ata.vi_date,
        ata.store_count_asn,
        ata.store_count_choice,
        ata.ata_is_resolved,
        ata.at_is_resolved,
        active_asn_flag,
        max(paf.style_color_description) as style_color_description
    FROM public.asn_to_allocate ata
    JOIN global.product_attributes_filter paf ON ata.article = paf.article
    GROUP BY 1,2,3,4,5,6,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29;
    
    -- Log the number of rows processed
    RAISE NOTICE 'Sync completed. Rows inserted: %', (SELECT COUNT(*) FROM inventory_smart.asn_to_allocate_alert);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;