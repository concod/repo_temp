--liquibase formatted sql
--changeset vishal.kumar@impactanalytics.co:get_oms_expedite_report_added_size_default_and_static_sorting runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-101297_5
--comment: MTP-101297
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_expedite_report(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_expedite_report(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_expedite_orders_report_sql  text:='';
   v_meta_cls             text:='';
   v_meta_cls_json        jsonb := $3;

 begin
 
	v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
	v_pa_sql := v_pa_sql || ' and ordering = ''Y''';
					
	if v_meta_cls_json <> '{}' then
		-- Replace size with size_order in the sort array if sort exists
		if jsonb_array_length(v_meta_cls_json -> 'sort') > 0 THEN
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				(
					SELECT jsonb_agg(
						CASE 
							WHEN lower(item ->> 'column') = 'size' 
							THEN jsonb_build_object('column', 'size_order', 'order', item ->> 'order')
							ELSE item
						END
					)
					FROM jsonb_array_elements(v_meta_cls_json -> 'sort') item
				)
			);
		end if;
		v_meta_cls := global.form_table_query(v_meta_cls_json) ;
	end if;



   v_expedite_orders_report_sql := 'select * from (
	select 
		gen_random_uuid() as unique_row_id,
		eor.product_code,
		eor.loc_code,
		eor.po_id,
		eor.vendor_name,
		eor.vendor_code,
		eor.DC_NAME,
		paf.l1_name, 
		paf.l2_name, 
		paf.l3_name,
		paf.l4_name,
		paf.range_usa,
		paf.range_eu_uk,
		paf.range_au_nz,
		paf.range_asia,
		paf.range_africa,
		eor.projected_delivery_date,
		eor.recom_receipt_date,
		eor.po_receipts,
		eor.po_receipts_cost,
		eor.dc_oh,
		eor.total_store_inv,
		(eor.dc_oh + eor.total_store_inv) as total_inv,
		eor.safety_stock_sto,
		ast."order" as size_order
from inventory_smart.expedite_orders_report eor  
join (
	select distinct on (l4_name) l4_name, l1_name, l2_name, l3_name, range_usa, range_asia, range_au_nz, range_eu_uk, range_africa, style_name, vendor 
	from "global".product_attributes_filter '||v_pa_sql||'
) paf ON paf.l4_name = eor.product_code
left join (
	select product_code, min("order") as "order"
	from inventory_smart.article_status_tag
	group by product_code
) ast on ast.product_code = eor.product_code
) X'||CASE WHEN v_meta_cls IS NULL OR v_meta_cls = '' THEN ' ORDER BY size_order ASC NULLS LAST' ELSE v_meta_cls END;       
   
   raise notice 'v_expedite_orders_report_sql %',v_expedite_orders_report_sql;
   open $1 for execute v_expedite_orders_report_sql;
   RETURN v_expedite_orders_report_sql;
 end
 $function$
;