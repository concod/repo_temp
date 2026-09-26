--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_receipts_dc_size_projection_report_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-91441
--comment: MTP-91441 receipts projection report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_dc_size_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_dc_size_projection_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_receipts_dc_size_projection_report_sql  text:='';
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
     v_col_value := 'receipt_quantity';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 'receipt_quantity_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg( 'fym'||fiscal_year_month::text , ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_receipt_projection order by fiscal_year_month
	) t
    );

   v_int_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_receipt_projection order by fiscal_year_month
	) t
    );

    v_sum_fiscal_year_months := (
    SELECT string_agg('sum(coalesce(fym' || fiscal_year_month::text || ',0)) as fym' || fiscal_year_month::text, ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_receipt_projection order by fiscal_year_month
	) t
    );

   v_receipts_dc_size_projection_report_sql := 'SELECT * from (
	SELECT 
    dc.name AS dc_name,
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
		            orp.product_code || ''::'' || orp.loc_code AS product_code_loc_code,
		            orp.fiscal_year_month, 
					coalesce(sum('||v_col_value||'::numeric)::int,0)
			        FROM inventory_smart.oms_receipt_projection orp
			        GROUP BY product_code_loc_code, orp.fiscal_year_month
			        ORDER BY product_code_loc_code, orp.fiscal_year_month
				$$,
		        $$
					SELECT DISTINCT fiscal_year_month 
		          	FROM inventory_smart.oms_receipt_projection 
		          	ORDER BY fiscal_year_month
				$$
		    ) AS pivot_table(
		        product_code_loc_code TEXT, 
		       '|| v_int_fiscal_year_months ||'
		    )
		) X  
		JOIN "global".distribution_centres dc ON dc.linked_store_code = X.loc_code AND dc.is_active AND NOT dc.is_deleted
		JOIN (select distinct on (l4_name) l4_name from "global".product_attributes_filter '||v_pa_sql||') paf
		ON paf.l4_name = X.product_code
		GROUP BY dc.dc_code, dc."name"
		ORDER BY 1
	)Z'|| v_meta_cls;       
   
   raise notice 'v_receipts_dc_size_projection_report_sql %',v_receipts_dc_size_projection_report_sql;
   open $1 for execute v_receipts_dc_size_projection_report_sql;
   RETURN v_receipts_dc_size_projection_report_sql;
 end
 $function$
;
