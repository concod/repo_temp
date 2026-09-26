--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_expedite_report runOnChange:true stripComments:false splitStatements:false context:MTP-114244 labels:MTP-114244
--comment: modified the get_oms_expedite_report function to add vendor_id and vendor_desc columns

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
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
	if v_meta_cls_json <> '{}' then
		-- Replace size with size_order in the sort array if sort exists
		if v_meta_cls_json -> 'sort' is not null and jsonb_array_length(v_meta_cls_json -> 'sort') > 0 then
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
		paf.vendor_id,
		paf.vendor_desc,
		eor.product_code,
		paf.l0_name, 
		paf.l1_name, 
		paf.l2_name, 
		paf.l3_name,
		eor.po_id,
		eor.projected_delivery_date,
		eor.recom_receipt_date,
		eor.po_receipts,
		eor.po_receipts_cost,
		eor.dc_oh,
		eor.safety_stock_sto,
		ast."order" as size_order

from inventory_smart.expedite_orders_report eor  
join ('||v_pa_sql||') paf using(product_code)
left join (
	select product_code, size, min("order") as "order"
	from inventory_smart.article_status_tag
	group by product_code, size
) ast on ast.product_code = eor.product_code and ast.size = paf.size
where paf.ordering = ''Y''
) X'||CASE WHEN v_meta_cls IS NULL OR v_meta_cls = '' THEN ' ORDER BY size_order ASC NULLS LAST' ELSE v_meta_cls END;       
   
   raise notice 'v_expedite_orders_report_sql %',v_expedite_orders_report_sql;
   open $1 for execute v_expedite_orders_report_sql;
   RETURN v_expedite_orders_report_sql;
 end
 $function$
;