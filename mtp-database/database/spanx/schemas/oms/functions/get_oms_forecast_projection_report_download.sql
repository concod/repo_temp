--liquibase formatted sql
--changeset chandranil.ghosh:get_oms_forecast_projection_report_download_2 runOnChange:true stripComments:false splitStatements:false context:MTP-75255 labels:MTP-78699-1.
--comment: added the product_code column
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_projection_report_download(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_projection_report_download(input refcursor, jsonb, jsonb, text)
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
   v_int_fiscal_year_months text:='';

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
    SELECT string_agg( 'fym'||fiscal_year_month::text , ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_int_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

    v_sum_fiscal_year_months := (
    SELECT string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_forecast_projection_report_sql := 'SELECT * from (
	SELECT 
      paf.article,
      X.loc_code,
      X.size,
      max(paf.product_code) as product_code,
		  MAX(paf.l0_name) AS l0_name,
      MAX(paf.l1_name) AS l1_name,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.label_code) AS label_code,
	    MAX(paf.dimension_pack) AS dimension_pack,
		  MAX(paf.l4_name) AS product_description,
		  MAX(X.vendor_code) AS vendor_code,
	    MAX(X.vendor_name) AS vendor_name,
	    '||v_sum_fiscal_year_months ||'
	    FROM (
		    SELECT 
          split_part(pls, ''::'', 1) AS product_code,
          split_part(pls, ''::'', 2) AS loc_code,
          split_part(pls, ''::'', 3) AS size,
          vendor_code,
          vendor_name,
          '|| v_fiscal_year_months ||'
		    FROM crosstab(
		        $$
					      SELECT 
		            product_code || ''::'' || loc_code || ''::'' || size_desc  AS pls,
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
		    ) AS pivot_table( pls TEXT, vendor_code TEXT, vendor_name TEXT, '|| v_int_fiscal_year_months ||')
		) X 
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		GROUP BY 1,2,3
		ORDER BY 1,2,3
	)Z
   '||v_meta_cls;       
   
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN v_forecast_projection_report_sql;
 end
 $function$
;