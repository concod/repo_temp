--liquibase formatted sql
--changeset chandra.nil.ghosh@impactanalytics.co:get_oms_expedite_report_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-79582.
--comment: MTP-79582.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_expedite_report(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_expedite_report(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_expedite_orders_report_sql  text:='';
   v_meta_cls             text:='';

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;



   v_expedite_orders_report_sql := 'select * from (
	select 
		gen_random_uuid() as unique_row_id,
		eor.vendor_code,
		eor.vendor_name,
		eor.product_code,
		eor.loc_code,
		eor.po_id,
		paf.article,
		paf.product_description,
		paf.l2_name,
		paf.l3_name,
		paf.l4_name,
		paf.l5_name,
		eor.projected_delivery_date,
		eor.recom_receipt_date,
		eor.po_receipts,
		eor.po_receipts_cost,
		eor.dc_oh,
		eor.total_store_inv,
		coalesce(eor.total_store_inv, 0) + coalesce(eor.dc_oh,0) as total_inv,
		eor.safety_stock_sto
from oms.expedite_orders_report eor  
join ('||v_pa_sql||') paf using(product_code)
where paf.ordering = ''Y''
) X'||v_meta_cls;       
   
   raise notice 'v_expedite_orders_report_sql %',v_expedite_orders_report_sql;
   open $1 for execute v_expedite_orders_report_sql;
   RETURN v_expedite_orders_report_sql;
 end
 $function$
;