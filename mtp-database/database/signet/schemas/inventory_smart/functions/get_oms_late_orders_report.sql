--liquibase formatted sql
--changeset aman.lakkoju:get_oms_late_orders_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_late_orders_report
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

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;



   v_late_orders_report_sql := 'select * from (
	select paf.vendor_code,
paf.vendor_name,
olor.product_code,
paf.product_description,
paf.l0_name,
paf.l1_name,
paf.l2_name,
paf.primary_wh,
paf.sku_grade,
paf.planning_ownership,
paf.merchandise_category,
paf.merchandise_brand,
olor.po_id,
olor.order_date,
olor.not_before_date,
olor.not_after_date,
ok.dc_inv,
olor.total_order_qty,
olor.total_order_qty_cost,
olor.total_received_qty,
olor.total_received_qty_cost,
olor.variance_unit,
olor.variance_unit_cost,
olor.four_week_open_qty,
olor.four_week_open_qty_cost
from inventory_smart.oms_late_orders_report olor  
join ('||v_pa_sql||') paf using(product_code)
left join inventory_smart.oms_kpi ok using(product_code)
) X'||v_meta_cls;       
   
   raise notice 'v_late_orders_report_sql %',v_late_orders_report_sql;
   open $1 for execute v_late_orders_report_sql;
   RETURN v_late_orders_report_sql;
 end
 $function$
;
;

