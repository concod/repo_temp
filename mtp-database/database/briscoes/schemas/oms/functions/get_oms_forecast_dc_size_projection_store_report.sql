--liquibase formatted sql
--changeset cascade:get_oms_forecast_dc_size_projection_store_report_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:forecast_projection_store
--comment: Initial creation of forecast DC size projection store report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_dc_size_projection_store_report(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_dc_size_projection_store_report(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_sa_sql               text:='';
   v_dc_size_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_sum_fiscal_year_months text:='';
   v_int_fiscal_year_months text:='';
   v_meta_cls_json        jsonb := $4;

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
   
  if v_meta_cls_json <> '{}' then 
    -- Replace size with size_order in the sort array if sort exists
		IF jsonb_array_length(v_meta_cls_json -> 'sort') > 0 THEN
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				COALESCE((
				SELECT jsonb_agg(
					CASE 
					WHEN lower(item ->> 'column') = 'size' 
					THEN jsonb_build_object('column', 'size_order', 'order', item ->> 'order')
					ELSE item
					END
				)
				FROM jsonb_array_elements(v_meta_cls_json -> 'sort') item
				), '[]'::jsonb)
			);
		ELSE
		-- Add a new sort object with size_order ASC when sort is empty
			v_meta_cls_json := jsonb_set(
				v_meta_cls_json,
				'{sort}',
				jsonb_build_array(
				jsonb_build_object('column', 'size_order', 'order', 'asc')
				)
			);
		END IF;
		v_meta_cls := global.form_table_query(v_meta_cls_json) ;
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
    SELECT string_agg( 'fym'||fiscal_year_month::text , ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection_store order by fiscal_year_month
	) t
    );

   v_int_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection_store order by fiscal_year_month
	) t
    );

    v_sum_fiscal_year_months := (
    SELECT string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_vendor_projection_store order by fiscal_year_month
	) t
    );

   v_dc_size_projection_report_sql := 'SELECT * from (
	SELECT 
    X.store_code,
    paf.size,
    concat(X.store_code,paf.size) as unique_row_id,
    ast."order" as size_order,
    '||v_sum_fiscal_year_months ||'
	FROM (
		    SELECT 
		        split_part(product_code_store_code, ''::'', 1) AS product_code,
		        split_part(product_code_store_code, ''::'', 2) AS store_code,
		        '|| v_fiscal_year_months ||'
		    FROM crosstab(
		        $$
					SELECT 
		            ovp.product_code || ''::'' || ovp.store_code AS product_code_store_code,
		            ovp.fiscal_year_month, 
					coalesce(sum('||v_col_value||'::numeric)::int,0)
			        FROM inventory_smart.oms_vendor_projection_store ovp
			        WHERE ovp.store_code IN (SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||')
			        GROUP BY product_code_store_code, ovp.fiscal_year_month
			        ORDER BY product_code_store_code, ovp.fiscal_year_month
				$$,
		        $$
					SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_vendor_projection_store 
		          	ORDER BY fiscal_year_month
				$$
		    ) AS pivot_table(
		        product_code_store_code TEXT, 
		       '|| v_int_fiscal_year_months ||'
		    )
		) X  
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		LEFT JOIN inventory_smart.article_status_tag ast
		ON ast.product_code = paf.product_code and ast.size = paf.size
		GROUP BY 1,2,3,4
		ORDER BY 1,2
	)Z'|| v_meta_cls;    
   
   raise notice 'v_dc_size_projection_report_sql %',v_dc_size_projection_report_sql;
   open $1 for execute v_dc_size_projection_report_sql;
   RETURN v_dc_size_projection_report_sql;
 end
 $function$
;
