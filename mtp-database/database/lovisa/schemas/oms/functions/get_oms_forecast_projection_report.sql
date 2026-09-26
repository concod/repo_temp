--liquibase formatted sql
--changeset kailash.kangne:get_oms_forecast_projection_report runOnChange:true stripComments:false splitStatements:false context:MTP-75288 labels:MTP-75288-2
--comment: MTP-75288
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_projection_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_forecast_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_sum_fiscal_year_months text:='';

 begin
   v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
   v_pa_sql := v_pa_sql || ' and ordering = ''Y''';
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

   v_forecast_projection_report_sql := 'SELECT * from (
	SELECT 
	    paf.l4_name,
      MAX(paf.style_name) AS style_name,
		  MAX(paf.vendor) AS vendor,
		  MAX(paf.l1_name) AS l1_name,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l3_name) AS l3_name,
		  MAX(paf.range_usa) AS range_usa,
		  MAX(paf.range_eu_uk) AS range_eu_uk,
		  MAX(paf.range_au_nz) AS range_au_nz,
		  MAX(paf.range_asia) AS range_asia,
		  MAX(paf.range_africa) AS range_africa,
	    '||v_sum_fiscal_year_months ||'
	    FROM (
		    SELECT *
		    FROM crosstab(
		        $$
					      SELECT 
		            product_code,
		            fiscal_year_month, 
		            coalesce(sum('||v_col_value||'::numeric)::int,0)
                FROM inventory_smart.oms_vendor_projection ovp
                GROUP BY 1,2
                ORDER BY 1,2
				    $$,
		        $$
					      SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_vendor_projection 
		          	ORDER BY fiscal_year_month
				    $$
		    ) AS pivot_table( product_code TEXT, '|| v_fiscal_year_months ||')
		) X 
		JOIN (select distinct on (l4_name) l4_name, l1_name, l2_name, l3_name, range_usa, range_asia, range_au_nz, range_eu_uk, range_africa , style_name, vendor from "global".product_attributes_filter '||v_pa_sql||') paf
		ON paf.l4_name = X.product_code
		GROUP BY 1
		ORDER BY 1
	)Z
   '||v_meta_cls;       
   
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN v_forecast_projection_report_sql;
 end
 $function$
;
