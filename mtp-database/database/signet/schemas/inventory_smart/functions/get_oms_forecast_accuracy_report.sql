
--liquibase formatted sql
--changeset shreyansh.jain:get_oms_forecast_accuracy_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_forecast_accuracy_report
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_accuracy_report(input refcursor, jsonb, jsonb,jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_accuracy_report(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
   v_pa_sql               text:='';
   v_forecast_accuracy_report_sql  text:='';
   v_meta_cls             text:='';
   v_date_rec                record;
   v_date_filter             text:='';
begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
for v_date_rec in select * from jsonb_to_recordset($4) as x(attribute_name text, "start_date" date, "end_date" date)
 	loop
 		v_date_filter := v_date_filter||' and ofar.'||v_date_rec.attribute_name||' between ''' ||v_date_rec.start_date||''' and '''||v_date_rec.end_date||'''';
 	end loop;
v_forecast_accuracy_report_sql := 'select *,
f.ia_vs_act/NULLIF(f.sales, 0) as net_perc_ia_vs_act,
f.adj_vs_act/NULLIF(f.sales, 0) as net_perc_adj_vs_act,
f.ia_vs_act_abs/NULLIF(f.sales, 0) as abs_perc_ia_vs_act,
 f.adj_vs_act_abs/NULLIF(f.sales, 0) as abs_perc_adj_vs_act
 	from (
select paf.vendor_code,
paf.vendor_name,
ofar.product_code,
paf.product_description,
paf.l0_name,
paf.l1_name,
paf.l2_name,
paf.primary_wh,
paf.sku_grade,
paf.planning_ownership,
sum(ofar.ia_fcst) ia_fcst,
sum(ofar.adj_fcst) adj_fcst,
sum(ofar.sales) sales,
sum(ofar.ia_vs_act) ia_vs_act,
sum(ofar.adj_vs_act) adj_vs_act,
sum(ofar.ia_vs_act_abs) ia_vs_act_abs,
sum(ofar.adj_vs_act_abs) adj_vs_act_abs
from inventory_smart.oms_forecast_accuracy_report ofar 
join ('||v_pa_sql||') paf using(product_code)
WHERE true '||v_date_filter||'
group by vendor_code,vendor_name,product_code,product_description,l0_name,l1_name,l2_name,primary_wh,sku_grade,planning_ownership
) f'||v_meta_cls;
raise notice 'v_forecast_accuracy_report_sql %',v_forecast_accuracy_report_sql;
   open $1 for execute v_forecast_accuracy_report_sql;
   RETURN v_forecast_accuracy_report_sql;
 end
 $function$
;