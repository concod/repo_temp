--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_receipts_projection_vendor_agg_report_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-91441
--comment: MTP-91441 Receipts projections report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_projection_vendor_agg_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_projection_vendor_agg_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
 begin
   v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
	   v_pa_sql := v_pa_sql || ' and ordering = ''Y''';
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;
  
   if $4 = 'unit'
   then
     v_col_value := 't1.receipt_quantity';
   end if;
   
   if $4 = 'cost'
   then
     v_col_value := 't1.receipt_quantity_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_receipt_projection order by fiscal_year_month
	) t
    );
   v_receipts_projection_report_sql := 'SELECT *
		FROM crosstab(
		    $$SELECT
		        t1.vendor_code,
                t1.vendor_name,
		        t1.fiscal_year_month,
		        ('||v_col_value||'::numeric)::int
		    FROM (
		        SELECT
		            orp.vendor_code,
		            orp.fiscal_year_month,
                    max(orp.vendor_name) as vendor_name,
		            SUM(orp.receipt_quantity) AS receipt_quantity,
		            SUM(orp.receipt_quantity_cost) AS receipt_quantity_cost
		        FROM inventory_smart.oms_receipt_projection orp
		        INNER JOIN (select distinct on (l4_name) l4_name from "global".product_attributes_filter '||v_pa_sql||') paf ON orp.product_code = paf.l4_name
		        GROUP BY 1, 2
		    ) t1
		    ORDER BY 1, 2
		    $$,
		    $$SELECT DISTINCT fiscal_year_month FROM inventory_smart.oms_receipt_projection ORDER BY fiscal_year_month$$
	) as X(vendor_code text, vendor_name text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
 end
 $function$
;
