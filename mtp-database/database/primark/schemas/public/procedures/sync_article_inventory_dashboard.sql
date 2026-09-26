--liquibase formatted sql
--changeset aman_lakkoju_:sync_article_inventory_dashboard_updated  runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_article_inventory_dashboard_updates
--comment: sync_article_inventory_dashboard_updated
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_article_inventory_dashboard();
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		if _is_historic then 
	 		select async_query into _worker from public.async_query('delete from 
	 		  inventory_smart.article_inventory_dashboard 
	 		where 
	 		  true;');
			perform public.async_query_status(_worker, 'cleanup');
			raise notice 'Step1: %', (clock_timestamp() - _st);
 			-- perform global.create_drop_index_list_ingestion('inventory_smart', 'article_inventory_dashboard', true);
 			-- raise notice 'Step2: %', (clock_timestamp() - _st);
 		end if;
 		perform public.parellel_insert('WITH rows AS ( INSERT INTO inventory_smart.article_inventory_dashboard (
    article,
    store_code,
    channel,

    oh,
    oo,
    it,
    tot_inv,

    lw_revenue,
    lw_margin,
    promo_percentage,

    total_count,
    in_stock_count,
    in_stock,

    normal,
    shortfall,
    stockout,
    excess,

    oh_dc,
    oo_dc,
    it_dc,

    wos_oh,
    wos_oh_it,
    twos,

    l0_name,
    l1_name,
    l2_name,
    l3_name,

    store_name,

    product_type,
    launch_date,
    price,

    l6m_units,

    ata_eaches,
    ata_packs,
    ata,

    dc_instock_count,
    dc_instock_total_count,
    dc_instock,

    lw_margin_percentage,

    week_to_date_sales,
    last_day_sales,

    sales_1_ago,
    sales_2_ago,
    sales_3_ago,
    sales_4_ago,
    sales_5_ago,
    sales_6_ago,
    sales_7_ago,
    sales_8_ago,

    average_discount,
    aur,
    ros,
    wos,

    dc_oh_oo_it_wos,
    dc_oh_wos,
    dc_oh_oo_wos,

    style_color_status,
    style_color_store_status,

    si,
    si_oh_it,
    si_oh_oo_it,

    available_stores_percentage,
    sell_through_rate,

    grade,
    product_description,

    version_code
)
SELECT
    article,
    store_code,
    channel,

    oh,
    oo,
    it,
    tot_inv,

    lw_revenue,
    lw_margin,
    promo_percentage,

    total_count,
    in_stock_count,
    in_stock,

    normal,
    shortfall,
    stockout,
    excess,

    oh_dc,
    oo_dc,
    it_dc,

    wos_oh,
    wos_oh_it,
    twos,

    l0_name,
    l1_name,
    l2_name,
    l3_name,

    store_name,

    product_type,
    launch_date,
    price,

    l6m_units,

    ata_eaches,
    ata_packs,
    ata,

    dc_instock_count,
    dc_instock_total_count,
    dc_instock,
	lw_margin_percentage,

    week_to_date_sales,
    last_day_sales,

    sales_1_ago,
    sales_2_ago,
    sales_3_ago,
    sales_4_ago,
    sales_5_ago,
    sales_6_ago,
    sales_7_ago,
    sales_8_ago,

    average_discount,
    aur,
    ros,
    wos,

    dc_oh_oo_it_wos,
    dc_oh_wos,
    dc_oh_oo_wos,
    style_color_status,
    style_color_store_status,
    si,
    si_oh_it,
    si_oh_oo_it,
    available_stores_percentage,
    sell_through_rate,
    grade,
    product_description,
    version_code
FROM public.article_inventory_dashboard {where} RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.article_inventory_dashboard', 'store_code', 'paid_store_idx');
		raise notice 'Step2: %', (clock_timestamp() - _st);
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

