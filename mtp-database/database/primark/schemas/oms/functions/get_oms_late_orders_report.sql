--liquibase formatted sql
--changeset chandra.nil.ghosh:get_oms_late_orders_report_added_size_default_and_static_sorting_17 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-86853
--comment: MTP-76154.
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
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
	if v_meta_cls_json <> '{}' then
		-- Replace size with size_order in the sort array if sort exists
		IF jsonb_array_length(v_meta_cls_json -> 'sort') > 0 THEN
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				COALESCE((
					SELECT jsonb_agg(
						CASE 
							WHEN lower(item ->> 'column') = 'size' 
							THEN jsonb_build_object('column', 'size_order', 'order', item ->> 'order')
							ELSE item
						END
					)
					FROM jsonb_array_elements(v_meta_cls_json -> 'sort') item
				), '[]'::jsonb)
			);
		ELSE
		-- Add a new sort object with size_order ASC when sort is empty
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				jsonb_build_array(
					jsonb_build_object('column', 'size_order', 'order', 'asc')
				)
			);
		END IF;
		v_meta_cls := global.form_table_query(v_meta_cls_json) ;
	end if;



   v_late_orders_report_sql := 'select * from (
	select 
		olor.po_id,
		olor.product_code,
		olor.loc_code,

		paf.article,
		paf.l0_name,
		paf.l1_name,  
		paf.l2_name, 
		paf.l1_name, 
		paf.l2_name,
		paf.l3_name,
		paf.size,
		paf.product_description,

		olor.vendor_code,
		olor.vendor_name,
		olor.order_date,
		olor.projected_delivery_date,
		olor.dc_oh,
		olor.order_qty_four_weeks,
		olor.order_cost_four_weeks,
		olor.total_order_qty,
		olor.total_received_qty,
		olor.late_order_qty,
		olor.total_received_cost,
		olor.late_order_cost,
		olor.total_order_cost,
		CASE 
			WHEN ock.pack_id IS NOT NULL AND ock.pack_id <> ''WP'' THEN ''View Pack Config''
			ELSE ''-''
		END AS view_pack_config,
		ast."order" as size_order
from oms.oms_late_orders_report olor  
join ('||v_pa_sql||') paf using(product_code)
LEFT JOIN oms.oms_pack_config ock ON olor.product_code = ock.product_code
LEFT JOIN 
	oms.article_status_tag ast 
ON 
	ast.product_code = olor.product_code
where paf.ordering = ''Y''
) X'|| v_meta_cls;       
   
   raise notice 'v_late_orders_report_sql %',v_late_orders_report_sql;
   open $1 for execute v_late_orders_report_sql;
   RETURN v_late_orders_report_sql;
 end
 $function$
;
