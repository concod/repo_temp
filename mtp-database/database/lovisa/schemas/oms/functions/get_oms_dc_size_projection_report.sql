--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_dc_size_projection_report_added_size_default_and_static_sorting runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-86853
--comment: MTP-84209
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_dc_size_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_dc_size_projection_report(input refcursor, jsonb, jsonb, text)
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
   v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
   v_pa_sql := v_pa_sql || ' and ordering = ''Y''';

   v_meta_cls := global.form_table_query(v_meta_cls_json) ;

   if $4 = 'unit'
   then
     v_col_value := 'order_quantity';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'order_quantity_cost';
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

   v_dc_size_projection_report_sql := 'SELECT * from (
	SELECT 
    X.loc_code,
    MAX(dc.name)::character varying AS dc_name,
    paf.l4_name,
    concat(X.loc_code,paf.l4_name) as unique_row_id,
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
			        FROM inventory_smart.oms_vendor_projection ovp
			        GROUP BY product_code_loc_code, ovp.fiscal_year_month
			        ORDER BY product_code_loc_code, ovp.fiscal_year_month
				$$,
		        $$
					SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_vendor_projection 
		          	ORDER BY fiscal_year_month
				$$
		    ) AS pivot_table(
		        product_code_loc_code TEXT, 
		       '|| v_int_fiscal_year_months ||'
		    )
		) X  
		JOIN (select distinct on (l4_name) l4_name, l1_name, l2_name, l3_name, range_usa, range_asia, range_au_nz, range_eu_uk, range_africa, style_name, vendor from "global".product_attributes_filter '||v_pa_sql||') paf
		ON paf.l4_name = X.product_code
		INNER JOIN "global".distribution_centres dc
		    ON dc.linked_store_code = X.loc_code
		    AND dc.is_active
		    AND NOT dc.is_deleted
		GROUP BY X.loc_code, paf.l4_name, concat(X.loc_code,paf.l4_name)
		ORDER BY X.loc_code, paf.l4_name
	)Z'|| v_meta_cls;       
   
   raise notice 'v_dc_size_projection_report_sql %',v_dc_size_projection_report_sql;
   open $1 for execute v_dc_size_projection_report_sql;
   RETURN v_dc_size_projection_report_sql;
 end
 $function$
;
