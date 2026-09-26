--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_forecast_dc_size_projection_report_added_size_default_and_static_sorting runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-84209
--comment: MTP-76874
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_forecast_dc_size_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION oms.get_oms_forecast_dc_size_projection_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_dc_size_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_sum_fiscal_year_months text:='';
   v_int_fiscal_year_months text:='';
   v_meta_cls_json        jsonb := $3;

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
  if v_meta_cls_json <> '{}' then 
    -- Replace size with size_order in the sort array if sort exists
		IF jsonb_array_length(v_meta_cls_json -> 'sort') > 0 then
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
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_int_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );

    v_sum_fiscal_year_months := (
    SELECT string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from oms.oms_vendor_projection order by fiscal_year_month
	) t
    );

   v_dc_size_projection_report_sql := 'SELECT * from (
	SELECT 
    X.loc_code,
    paf.size,
    paf.article,
    ast."order" as size_order,
    '||v_sum_fiscal_year_months ||'
	FROM (
		    SELECT 
		        split_part(product_code_loc_code, ''::'', 1) AS product_code,
		        split_part(product_code_loc_code, ''::'', 2) AS loc_code,
		        '|| v_fiscal_year_months ||'
		    FROM crosstab(
		        $$
					SELECT 
					--(article + size) product_code, loc_code 
		            ovp.product_code || ''::'' || ovp.loc_code AS product_code_loc_code,
		            ovp.fiscal_year_month, 
					coalesce(sum('||v_col_value||'::numeric)::int,0)
			        FROM oms.oms_vendor_projection ovp
			        GROUP BY product_code_loc_code, ovp.fiscal_year_month
			        ORDER BY product_code_loc_code, ovp.fiscal_year_month
				$$,
		        $$
					SELECT DISTINCT fiscal_year_month 
		          	FROM oms.oms_vendor_projection 
		          	ORDER BY fiscal_year_month
				$$
		    ) AS pivot_table(
		        product_code_loc_code TEXT, 
		       '|| v_int_fiscal_year_months ||'
		    )
		) X  
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = X.product_code and paf.ordering = ''Y''
		LEFT JOIN oms.article_status_tag ast
		ON ast.product_code = paf.product_code and ast.size = paf.size
		GROUP BY paf.article, paf.size, X.loc_code, ast."order"
		ORDER BY paf.article, paf.size, X.loc_code
	)Z'|| v_meta_cls;       
   
   raise notice 'v_dc_size_projection_report_sql %',v_dc_size_projection_report_sql;
   open $1 for execute v_dc_size_projection_report_sql;
   RETURN v_dc_size_projection_report_sql;
 end
 $function$
;