--liquibase formatted sql
--changeset cascade:get_oms_forecast_projection_store_report_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:forecast_projection_store
--comment: Initial creation of forecast projection store report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_projection_store_report(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_projection_store_report(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_sa_sql               text:='';
   v_forecast_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_sum_fiscal_year_months text:='';

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
   
   if $4 <> '{}'
   then 
     v_meta_cls := global.form_table_query($4);
   end if;

   if $5 = 'unit'
   then
     v_col_value := 'store_forecast_pred';
   end if;
   
   if $5 = 'cost'
   then
     v_col_value := 'store_forecast_pred_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection_store order by fiscal_year_month
	) t
    );

	IF v_fiscal_year_months IS NULL THEN
		OPEN $1 FOR SELECT 'No data in oms_vendor_projection_store table' AS message;
		RETURN $1;
	END IF;

     v_sum_fiscal_year_months := (
    SELECT string_agg('sum(fym' || fiscal_year_month::text || ') as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection_store order by fiscal_year_month
	) t
    );

   v_forecast_projection_report_sql := 'SELECT * from (
	SELECT 
	    paf.article,
	    MAX(paf.product_description) AS product_description,
		MAX(paf.l0_name) AS l0_name,
      	MAX(paf.l1_name) AS l1_name,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l3_name) AS l3_name,
	    MAX(paf.merchandise_category_name) AS merchandise_category_name,
      	MAX(paf.local_flag) AS local_flag,
	    MAX(paf.article_value_stream) AS article_value_stream,
	    '||v_sum_fiscal_year_months ||'
	    FROM (
		    SELECT *
		    FROM crosstab(
		        $$
					      SELECT 
		            product_code,
		            fiscal_year_month, 
		            coalesce(sum('||v_col_value||'::numeric)::int,0)
                FROM inventory_smart.oms_vendor_projection_store ovp
                WHERE store_code IN (SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||')
                GROUP BY 1,2
                ORDER BY 1,2
				    $$,
		        $$
					      SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_vendor_projection_store 
		          	ORDER BY fiscal_year_month
				    $$
		    ) AS pivot_table( product_code TEXT, '|| v_fiscal_year_months ||')
		) X 
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		GROUP BY paf.article
		ORDER BY paf.article
	)Z
   '||v_meta_cls;       
   
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN v_forecast_projection_report_sql;
 end
 $function$
;
