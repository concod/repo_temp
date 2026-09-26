--liquibase formatted sql
--changeset Dharshan.patil:get_oms_forecast_projection_report runOnChange:true stripComments:false splitStatements:false context:MTP-75255 labels:MTP-80527.
--comment: MTP-85259
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_projection_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_vendor_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
	 v_sum_fiscal_year_months text:='';

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
     v_col_value := 'store_forecast_pred';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'store_forecast_pred_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

	IF v_fiscal_year_months IS NULL THEN
      OPEN $1 FOR SELECT 'No data in oms_vendor_projection table' AS message;
      RETURN $1;
	  END IF;

	v_sum_fiscal_year_months := (
    SELECT string_agg('sum(fym' || fiscal_year_month::text || ') as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_vendor_projection_report_sql := 'SELECT * from (
	SELECT 
	    paf.style,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l3_name) AS l3_name,
	    MAX(paf.l4_name) AS l4_name,
	    MAX(paf.l5_name) AS l5_name,
		MAX(paf.season) AS season,
	    MAX(paf.class) AS class,
		MAX(paf.style_description) AS style_description,
		MAX(X.vendor_code) AS vendor_code,
	    MAX(X.vendor_name) AS vendor_name,
	    '||v_sum_fiscal_year_months ||'
	    FROM (
		    SELECT *
		    FROM crosstab(
		        $$
					      SELECT 
		            product_code,
					      vendor_code, 
					      vendor_name, 
		            fiscal_year_month, 
		            coalesce(sum('||v_col_value||'::numeric)::int,0)
                FROM inventory_smart.oms_vendor_projection ovp
                GROUP BY 1,2,3,4
                ORDER BY 1,2,3,4
				    $$,
		        $$
					      SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_vendor_projection 
		          	ORDER BY fiscal_year_month
				    $$
		    ) AS pivot_table( product_code TEXT,vendor_code TEXT, vendor_name TEXT, '|| v_fiscal_year_months ||')
		) X 
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		GROUP BY 1
		ORDER BY 1
	)Z
   '||v_meta_cls;       
   
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN v_vendor_projection_report_sql;
 end
 $function$
;