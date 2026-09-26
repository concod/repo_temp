--liquibase formatted sql
--changeset pradeep.kumar:sync_alerts_product_store_level_dev runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_alert_ps_level
--comment: initial changeset for sync_alerts_product_store_level

DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level();

CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level()
  LANGUAGE plpgsql 
  SECURITY DEFINER 
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    DELETE FROM
        inventory_smart.alerts_product_store_level
    WHERE
        TRUE;
    INSERT INTO inventory_smart.alerts_product_store_level (
        article,
        l7_name,
        color,
        l0_name,
        l3_name,
        l4_name,
        l5_name,
        l6_name,
        subbrand_code_desc,
        collection,
        masterstyle_descr,
        product_lifecycle,
        flex_style,
        generic,
        sizes_mat,
        form,
        user_defined_1,
        user_defined_2,
        user_defined_3,
        user_defined_4,
        user_defined_5,
        inventory_status,
        oh,
        it,
        oo,
        total_inv,
        wip,
        r_site_oh,
        r_site_it,
        r_site_oo,
        r_site_total_inv,
        r_site_wip,
        lw_revenue,
        lw_sales,
        l4w_avg_sales,
        week_to_day_sales,
        forward_wos,
        node_forward_wos,
        size_integrity_oh,
        size_integrity_oh_oo_it,
        avg_target_wos,
        sizes_count,
        min,
        below_mins_ind,
        oh_dc,
        oo_it_dc,
        store_code,
        store_name,
        channel,
        partner_group_name,
        regional_master_name,
        store_format_description,
        vsba_regional_dc_descr,
        region_name,
        s1_name,
        s3_name,
        s4_name,
        launch_date,
        launch_floorset,
        floorset_ship_date,
        floorset_start_date,
        floorset_end_date,
        last_allocation_date,
        store_count,
        outbount_nodes_count,
        stockout_and_shortfall_flag,
        below_mins_flag,
        upcoming_floorset_promised_flag,
        aur,
        excess,
        normal,
        stockout,
        shortfall,
        l_site_oh,
        l_site_oo,
        l_site_it,
        l_site_wip,
        l_site_total_inv)
    SELECT
        article,
        l7_name,
        color,
        l0_name,
        l3_name,
        l4_name,
        l5_name,
        l6_name,
        subbrand_code_desc,
        collection,
        masterstyle_descr,
        product_lifecycle,
        flex_style,
        generic,
        sizes_mat,
        form,
        user_defined_1,
        user_defined_2,
        user_defined_3,
        user_defined_4,
        user_defined_5,
        inventory_status,
        oh,
        it,
        oo,
        total_inv,
        wip,
        r_site_oh,
        r_site_it,
        r_site_oo,
        r_site_total_inv,
        r_site_wip,
        lw_revenue,
        lw_sales,
        l4w_avg_sales,
        week_to_date_sales AS week_to_day_sales,
        forward_wos,
        NULL AS node_forward_wos,
        size_integrity_oh,
        size_integrity_oh_oo_it,
        target_wos AS avg_target_wos,
        sizes_count,
        min,
        below_mins_ind,
        oh_dc,
        oo_it_dc,
        store_code,
        a.store_name,
        a.channel,
        partner_group_name,
        regional_master_name,
        store_format_description,
        vsba_regional_dc_descr,
        region_name,
        a.s1_name,
        a.s3_name,
        a.s4_name,
        NULL AS launch_date,
        floorset AS launch_floorset,
        NULL AS floorset_ship_date,
        fs_startdate AS floorset_start_date,
        fs_enddate AS floorset_end_date,
        NULL AS last_allocation_date,
        NULL AS store_count,
        NULL AS outbount_nodes_count,
        stockout_and_shortfall_flag,
        below_mins_flag,
        NULL AS upcoming_floorset_promised_flag,
        aur,
        excess,
        normal,
        stockout,
        shortfall,
        l_site_oh,
        l_site_oo,
        l_site_it,
        l_site_wip,
        l_site_total_inv
    FROM
        public.choice_store_level_alerts AS a
    JOIN
        global.store_attributes_filter sm
    USING
        (store_code);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$ ;