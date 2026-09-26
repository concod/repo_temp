-- liquibase formatted sql
-- changeset shrinidhi.choragi:updated_sync_article_inventory_dashboard runOnChange:true stripComments:false splitStatements:false context:added column margin_perc labels:added lw_margin_percentage
-- comment: updated_sync_article_inventory_dashboard to add margin_perc

DROP PROCEDURE if exists public.sync_article_inventory_dashboard();

CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.article_inventory_dashboard
 		where 
 		  true;
 		insert into inventory_smart.article_inventory_dashboard (
 		article, style, style_description, l0_name, l1_name, l2_name, 
 		l3_name, l4_name, season, gender, l5_name, collection, class, 
 		subclass,sty_primary_occsn_end_use_dsc, product_type, launch_date,clearance_flag, clearance, planned_clearance_date, 
 		store_code, store_name, store_grade, price, msrp, oh, it, oo, total_inv, 
 		wtd_units,lw_units,w2_units,w3_units,w4_units,w5_units,w6_units,w7_units,
		w8_units, lw_margin, lw_revenue, l4w_units, l4w_revenue, l8w_units,l6m_units, discount,
 		promo, twos,wos_oh_oo_it, wos_oh_oo,wos_oh_it, wos_oh, dc_wos_oh_oo_it, dc_wos_oh_oo, 
 		dc_wos_oh, stockout, shortfall, excess, normal,article_alert_flag, sell_through_perc, ata_eaches,
 		ata_packs, ata, dc_instock,dc_oo, in_stock, in_stock_ata, allocated_units,in_stock_count, total_count, 
 		dc_instock_count, dc_instock_total_count, in_stock_dc_ata_count, in_stock_dc_ata_total_count, 
    lw_margin_percentage
 		)
		SELECT 
            a.article, pm.style, pm.style_description, pm.l0_name, pm.l1_name, pm.l2_name, 
        pm.l3_name, pm.l4_name, pm.season, pm.gender, pm.l5_name, pm.collection, pm.class, 
        pm.subclass,pm.sty_primary_occsn_end_use_dsc, pm.product_type, pm.launch_date,pm.clearance_flag, pm.clearance, pm.planned_clearance_date, 
        store_code, sm.store_name, sm.store_grade, price, msrp, oh, it, oo, total_inv, 
        wtd_units,lw_units, w2_units,w3_units,w4_units,w5_units,w6_units,w7_units,
		w8_units,lw_margin, lw_revenue, l4w_units, l4w_revenue, l8w_units,l6m_units, discount,
        promo, twos,wos_oh_oo_it, wos_oh_oo,wos_oh_it, wos_oh, dc_wos_oh_oo_it, dc_wos_oh_oo, 
        dc_wos_oh, stockout, shortfall, excess, normal,article_alert_flag, sell_through_perc, ata_eaches,
        ata_packs, ata, dc_instock,dc_oo, in_stock, in_stock_ata, allocated_units,in_stock_count, total_count, 
 		    dc_instock_count, dc_instock_total_count, in_stock_dc_ata_count, in_stock_dc_ata_total_count, lw_margin_percentage
        FROM  
        (select distinct article,store_code,msrp, oh, it, oo, total_inv, wtd_units,lw_units,w2_units,w3_units,w4_units,w5_units,w6_units,w7_units,
		w8_units, lw_margin, lw_revenue, l4w_units, 
        l4w_revenue, l8w_units,l6m_units, discount, promo, twos,wos_oh_oo_it, wos_oh_oo,wos_oh_it, wos_oh, dc_wos_oh_oo_it, dc_wos_oh_oo, dc_wos_oh, 
        stockout, shortfall, excess, normal,article_alert_flag, sell_through_perc, ata_eaches, ata_packs, ata, dc_instock,dc_oo, in_stock, 
        in_stock_ata, allocated_units,in_stock_count, total_count, 
 		    dc_instock_count, dc_instock_total_count, in_stock_dc_ata_count, in_stock_dc_ata_total_count, lw_margin_percentage
        from public.article_inventory_dashboard a) a
        join
        (select distinct article, style, style_description, l0_name, l1_name, l2_name,l3_name, 
        l4_name, season, gender, l5_name, collection, class,subclass,sty_primary_occsn_end_use_dsc, 
        product_life_cycle as product_type,launch_date,clearance_flag,
        case WHEN clearance_flag = 'Clearance' THEN true else false end AS clearance, 
        planned_clearance_date, price
        from "global".product_attributes_filter
		where active is true) pm
        using(article)
        join
        (select distinct store_code, store_name, q_str_grade as store_grade from "global".store_attributes_filter) sm
        using(store_code)
 		;
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
