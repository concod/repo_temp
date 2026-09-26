--liquibase formatted sql
--changeset cascade:get_oms_receipts_projection_store_vendor_agg_report_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:receipt_projection_store
--comment: Initial creation of receipts projection store vendor aggregated report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_projection_store_vendor_agg_report(refcursor, jsonb, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_projection_store_vendor_agg_report(input refcursor, jsonb, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_sa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
   
   if $4 <> '{}'
   then 
     v_meta_cls := global.form_table_query($4);
   end if;
  
   if $5 = 'unit'
   then
     v_col_value := 't1.receipt_quantity';
   end if;
   
   if $5 = 'cost'
   then
     v_col_value := 't1.receipt_quantity_cost';
   end if;

   v_fiscal_year_months := (
    SELECT string_agg('"fym' || fiscal_year_month::text || '" int', ', ') FROM (
		select distinct fiscal_year_month from inventory_smart.oms_receipt_projection_store order by fiscal_year_month
	) t
    );

    IF v_fiscal_year_months IS NULL THEN
      OPEN $1 FOR SELECT 'No data in oms_receipt_projection_store table' AS message;
      RETURN $1;
	  END IF; 

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
		        FROM inventory_smart.oms_receipt_projection_store orp
		        INNER JOIN ('||v_pa_sql||') paf ON orp.product_code = paf.product_code
		        WHERE paf.ordering = ''Y''
		        AND orp.store_code IN (SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||')
		        GROUP BY 1, 2
		    ) t1
		    ORDER BY 1, 2
		    $$,
		    $$SELECT DISTINCT fiscal_year_month FROM inventory_smart.oms_receipt_projection_store ORDER BY fiscal_year_month$$
	) as X(vendor_code text, vendor_name text, '|| v_fiscal_year_months ||')
   '||v_meta_cls;       
   
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
 end
 $function$
;
