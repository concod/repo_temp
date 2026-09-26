--liquibase formatted sql
--changeset aman.lakkoju:get_oms_expedite_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_expedite_report
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_expedite_report(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_expedite_report(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_expedite_report_sql  text:='';
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



   v_expedite_report_sql := 'select * from (
	select paf.vendor_code,
paf.vendor_name,
oer.product_code,
paf.product_description,
paf.l0_name,
paf.l1_name,
paf.l2_name,
paf.primary_wh,
paf.sku_grade,
paf.planning_ownership,
oer.po_id,
oer.not_before_date,
oer.stockout_date,
oer.open_quantity,
oer.open_quantity_cost,
ok.store_inv,
ok.dc_inv,
ok.mrpc,
ok.system_inv,
oer.safety_stock
from inventory_smart.oms_expedite_report oer 
join ('||v_pa_sql||') paf using(product_code)
left join inventory_smart.oms_kpi ok using(product_code)
) X'||v_meta_cls;       
   
   raise notice 'v_expedite_report_sql %',v_expedite_report_sql;
   open $1 for execute v_expedite_report_sql;
   RETURN v_expedite_report_sql;
 end
 $function$
;
