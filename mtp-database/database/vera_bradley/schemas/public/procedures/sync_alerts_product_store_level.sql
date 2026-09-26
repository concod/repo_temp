--liquibase formatted sql
--changeset shrinidhi.choragi@impactanalytics.co:sync_alerts_product_store_level runOnChange:true stripComments:false splitStatements:false context:MTP-25137 labels:added allocation status condition 
--comment: added the condition based on status of the allocation to be either in order batching or finalized state.
--rollback: SELECT 1
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
			article, channel, store_code, style_description, product_type, 
			launch_date, last_allocated, selldown_date, clearance_end_date, retirement_date, 
			"style", l0_name, l1_name, l2_name, 
			lw_sales_units, lw_sales_revenue, lw_margin, 
			discount, price, dc_on_hand, store_on_hand, store_on_order, intransit_to_store, fwos, 
			instock_percentage, stockout, shortfall, normal, excess, case_pack_quantity, instock_percent, 
			week_to_date_sales, yesterday_sales, sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago, 
			bulk_remaining, available_to_allocate, dc_oh_1_wms_location, dc_oh_qcloc, dc_oh_cwc, dc_oh_10, oo_dc, it_dc, 
			clearance_start_date, clearance_alert, retirement_alert, selldown_alert, launch_alert, kits_alert, topn_alert, stockout_alert, shortfall_alert, excess_alert, 
			pack_id, oh_pack_qty, si, promo, store_name, auto_alloc_alert, ca_is_resolved, ra_is_resolved, sla_is_resolved, la_is_resolved, kta_is_resolved, tna_is_resolved, 
			sta_is_resolved, sfa_is_resolved, ea_is_resolved, color_code, pack_description, color,fabrication,selling_collection,l3_name,number_of_allocations,
			variance_alert,store_count,min_deviation,max_deviation,variance,agg_variance
  		) 
  		SELECT 
			article, channel, store_code, a.style_description, a.product_type, 
			a.launch_date, w.last_allocated, a.selldown_date, a.clearance_end_date, a.retirement_date, 
			a."style", a.l0_name, a.l1_name, a.l2_name, 
			a.lw_sales_units, a.lw_sales_revenue, a.lw_margin, 
			a.discount, a.price, a.dc_on_hand, a.store_on_hand, a.store_on_order, a.intransit_to_store, a.fwos, 
			a.instock_percentage, a.stockout, a.shortfall, a.normal, a.excess, a.case_pack_quantity, a.instock_percent, 
			a.week_to_date_sales, a.yesterday_sales, a.sales_1_ago, a.sales_2_ago, a.sales_3_ago, a.sales_4_ago, 
			a.bulk_remaining, a.available_to_allocate, a.dc_oh_1_wms_location, a.dc_oh_qcloc, a.dc_oh_cwc, a.dc_oh_10, a.oo_dc, it_dc, 
			a.clearance_start_date, a.clearance_alert, a.retirement_alert, a.selldown_alert, a.launch_alert, a.kits_alert, a.topn_alert, a.stockout_alert, a.shortfall_alert, a.excess_alert, 
			a.pack_id, a.oh_pack_qty, a.si, a.promo, a.store_name, a.auto_alloc_alert, a.ca_is_resolved, a.ra_is_resolved, a.sla_is_resolved, a.la_is_resolved, a.kta_is_resolved, a.tna_is_resolved, 
			a.sta_is_resolved, a.sfa_is_resolved, a.ea_is_resolved, a.color_code, a.pack_description,a.color,a.fabrication,a.selling_collection,paf.l3_name,coalesce(c.number_of_allocations,0) as number_of_allocations,
			a.variance_alert,a.store_count,a.min_deviation,a.max_deviation,a.variance,a.agg_variance
		FROM 
  		  public.alerts_product_store_level a
  		  left join (select article,l3_name  from "global".product_attributes_filter paf group by 1,2) as paf
  		  using(article)
  		  left join (
  		  SELECT article,channel,count(distinct allocation_code) as number_of_allocations 
 FROM inventory_smart.create_allocation_result_flat_gurobi carfs
 LEFT JOIN global.store_attributes_filter saf ON store_code = store
 LEFT JOIN (
 SELECT * FROM inventory_smart.plan_master where type in ('0','2')
 ) pm ON carfs.allocation_code = pm.plan_code where
  pm.status = 2
 AND pm.is_deleted = false
 group by 1,2
  		  ) as c using(article,channel)
 left join (
 select
	article, 
	max(p.updated_at) as last_allocated, channel
from
	inventory_smart.plan_master p
join inventory_smart.create_allocation_result_flat_gurobi c on
	c.allocation_code = p.plan_code
join global.store_attributes_filter s on c.store = s.store_code 
where p.is_deleted = false and p.status in (2,3) 
 group by 1,3) as w using(article,channel);
  	end
  $procedure$
;