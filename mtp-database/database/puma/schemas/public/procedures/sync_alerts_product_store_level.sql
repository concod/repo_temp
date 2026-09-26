--liquibase formatted sql
--changeset linu.nazil:sync_alerts_product_store_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for alerts_product_store_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
   	begin
   		if _is_historic then 
	 		delete from 
	 		  inventory_smart.alerts_product_store_level 
	 		where 
	 		  true;
		end if;
		insert into inventory_smart.alerts_product_store_level (
    		store_code,
			last_allocated,
			lw_units,
			lw_revenue,
			lw_margin,
			promo,
			lw_aur,
			store_on_hand,
			total_store_on_hand,
			on_order,
			in_transit,
			wos_oh,
			wos_oh_oo,
			wos,
			united_legwear_whs,
			retail_bulk,
			retail_bulk_wh20,
			puma_retail_stores_wh10,
			us_continental,
			infinity,
			size_integrity,
			size_integrity_dc,
			stockout,
			shortfall,
			normal,
			excess,
			total_stores,
			clearance_alert,
			launch_alert,
			current_season_alert,
			shortfall_alert,
			stockout_alert,
			excess_alert,
			auto_alloc_alert,
			style_description,
			color,
			l2_name,
			l4_name,
			l5_name,
			article,
			l3_name,
			l1_name,
			l0_name,
			clearance_article,
			articlestatustag,
			store_id,
			store_name
   		) 
   		SELECT 
   		   	store_code,
			last_allocated,
			lw_units,
			lw_revenue,
			lw_margin,
			promo,
			lw_aur,
			store_on_hand,
			total_store_on_hand,
			on_order,
			in_transit,
			wos_oh,
			wos_oh_oo,
			wos,
			united_legwear_whs,
			retail_bulk,
			retail_bulk_wh20,
			puma_retail_stores_wh10,
			us_continental,
			infinity,
			size_integrity,
			size_integrity_dc,
			stockout,
			shortfall,
			normal,
			excess,
			total_stores,
			clearance_alert,
			launch_alert,
			current_season_alert,
			shortfall_alert,
			stockout_alert,
			excess_alert,
			auto_alloc_alert,
			style_description,
			color,
			l2_name,
			l4_name,
			l5_name,
			article,
			l3_name,
			l1_name,
			l0_name,
			clearance_article,
			articlestatustag,
			store_id,
			store_name
   		FROM 
   		  public.alerts_product_store_level;
   	end
   $procedure$
;
