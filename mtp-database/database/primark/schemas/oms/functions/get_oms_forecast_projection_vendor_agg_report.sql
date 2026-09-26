--liquibase formatted sql
--changeset kailash.kangne:get_oms_forecast_projection_vendor_agg_report runOnChange:true stripComments:false splitStatements:false context:MTP-75288 labels:MTP-76874
--comment: MTP-76874
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_forecast_projection_vendor_agg_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION oms.get_oms_forecast_projection_vendor_agg_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_forecast_projection_report_sql  text:='';
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
     v_col_value := 't1.store_forecast_pred';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 't1.store_forecast_pred_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );
   v_forecast_projection_report_sql := 'SELECT *
		FROM crosstab(
		    $$SELECT
		        t1.vendor_code,
                t1.vendor_name,
		        t1.fiscal_year_month,
		        ('||v_col_value||'::numeric)::int
		    FROM (
		        SELECT
		            ofp.vendor_code,
		            ofp.fiscal_year_month,
                    max(ofp.vendor_name) as vendor_name,
		            SUM(ofp.store_forecast_pred) AS store_forecast_pred,
		            SUM(ofp.store_forecast_pred_cost) AS store_forecast_pred_cost
		        FROM oms.oms_vendor_projection ofp
		        INNER JOIN ('||v_pa_sql||') paf ON ofp.product_code = paf.product_code
		        GROUP BY 1, 2
		    ) t1
		    ORDER BY 1, 2
		    $$,
		    $$SELECT DISTINCT fiscal_year_month FROM oms.oms_vendor_projection ORDER BY fiscal_year_month$$
	) as X(vendor_code text, vendor_name text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN $1;
 end
 $function$
;