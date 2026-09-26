--liquibase formatted sql
--changeset piyush.raj:get_oms_late_orders_report_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-86853
--comment: MTP-133977
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_late_orders_report(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_late_orders_report(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_late_orders_report_sql  text:='';
   v_meta_cls             text:='';
   v_meta_cls_json        jsonb := $3;

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes','article', $2);
	if v_meta_cls_json <> '{}' then
		v_meta_cls := global.form_table_query(v_meta_cls_json);
	end if;

   v_late_orders_report_sql := 'select * from (
	select 
		paf.primary_vendor_id,
		paf.primary_vendor_name,
		paf.article,
		paf.l1_name,  
		paf.l2_name, 
		paf.l3_name, 
		paf.l6_name,
		paf.style_color_desc,

		saf.dc_name,
		saf.store_code,	
		''Channel'' as channel,
	
		olor.po_id,
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

from oms.oms_late_orders_report olor  
join ('||v_pa_sql||') paf using(article)
join global.store_attributes_filter saf ON olor.loc_code = saf.store_code
where paf.ordering = ''Y''
) X'|| v_meta_cls;       
   
   raise notice 'v_late_orders_report_sql %',v_late_orders_report_sql;
   open $1 for execute v_late_orders_report_sql;
   RETURN v_late_orders_report_sql;
 end
 $function$
;