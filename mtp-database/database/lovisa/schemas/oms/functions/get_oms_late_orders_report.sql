--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_late_orders_report_added_size_default_and_static_sorting_MTP-131864 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-86853
--comment: MTP-76874
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_late_orders_report(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_late_orders_report(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_late_orders_report_sql  text:='';
   v_meta_cls             text:='';
   v_meta_cls_json        jsonb := $3;


 begin
   v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
   v_pa_sql := v_pa_sql || ' and ordering = ''Y''';
	

	v_meta_cls := global.form_table_query(v_meta_cls_json) ;
	

   v_late_orders_report_sql := 'select * from (
	select 
		olor.po_id,
		olor.product_code,
		olor.loc_code,
		dc.name AS dc_name,

		paf.l1_name, 
		paf.l2_name, 
		paf.l3_name, 
		paf.l4_name, 
		paf.range_usa, 
		paf.range_eu_uk, 
		paf.range_au_nz, 
		paf.range_asia, 
		paf.range_africa,
		paf.vendor_id,
		paf.vendor,

		olor.order_date,
		olor.projected_delivery_date,
		olor.dc_oh,
		olor.order_qty_four_weeks,
		olor.order_cost_four_weeks,
		olor.total_order_qty,
		olor.total_order_cost,
		olor.total_received_qty,
		olor.total_received_cost,
		olor.late_order_qty,
		olor.late_order_cost
	from inventory_smart.oms_late_orders_report olor
	inner join global.distribution_centres dc
		on dc.linked_store_code = olor.loc_code
		and dc.is_active
		and not dc.is_deleted
	join (select distinct on (l4_name) l4_name, l1_name, l2_name, l3_name, range_usa, range_asia, range_au_nz, range_eu_uk, range_africa, vendor_id, vendor from "global".product_attributes_filter '||v_pa_sql||') paf on paf.l4_name = olor.product_code
	) X' || v_meta_cls;       
   
   raise notice 'v_late_orders_report_sql %',v_late_orders_report_sql;
   open $1 for execute v_late_orders_report_sql;
   RETURN v_late_orders_report_sql;
 end
 $function$
;
