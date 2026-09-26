--liquibase formatted sql
--changeset liquibase:get_oms_dropship_report_vendor_agg runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_dropship_report_vendor_agg
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_dropship_report_vendor_agg(input refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_dropship_report_vendor_agg(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_dropship_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
  
   if $4 = 'unit'
   then
     v_col_value := 'concat(
	    ''{"predictions": '', t1.sum_predictions,
	    '', "adjusted_predictions": '', t1.sum_adjusted_predictions,''}''
     )';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'concat(
	    ''{"total_cost": '', t1.sum_total_cost,
	    '', "adjusted_total_cost": '', t1.sum_adjusted_total_cost, ''}''
     )';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"' || fiscal_year_month::text || '" text', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_drop_ship_forecast_projection order by fiscal_year_month
	) t
    );
   v_dropship_report_sql := 'SELECT *
		FROM crosstab(
		    $$SELECT
		        t1.vendor_code,
                t1.vendor_name,
		        t1.fiscal_year_month,
		        '||v_col_value||'
		    FROM (
		        SELECT
		            odsfp.vendor_code,
		            odsfp.fiscal_year_month,
                    max(paf.vendor_name) as vendor_name,
		            SUM(odsfp.predictions) AS sum_predictions,
		            SUM(odsfp.adjusted_predictions) AS sum_adjusted_predictions,
		            SUM(odsfp.total_cost) AS sum_total_cost,
		            SUM(odsfp.adjusted_total_cost) AS sum_adjusted_total_cost
		        FROM inventory_smart.oms_drop_ship_forecast_projection odsfp
		        INNER JOIN ('||v_pa_sql||') paf ON odsfp.product_code = paf.product_code
		        GROUP BY 1, 2
		    ) t1
		    ORDER BY 1, 2
		    $$,
		    $$SELECT DISTINCT fiscal_year_month FROM inventory_smart.oms_drop_ship_forecast_projection ORDER BY fiscal_year_month$$
	) as X(vendor_code text, vendor_name text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_dropship_report_sql %',v_dropship_report_sql;
   open $1 for execute v_dropship_report_sql;
   RETURN $1;
 end
 $function$
;
