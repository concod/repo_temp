--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_receipts_projection_report_2 runOnChange:true stripComments:false splitStatements:false context:MTP-114244 labels:MTP-114244
--comment: modified the get_oms_receipts_projection_report function to add vendor_id and vendor_desc columns

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_projection_report(refcursor, jsonb, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_projection_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
   v_meta_cls             text:='';
   v_dynamic_columns      text:='';
   v_fiscal_year_months   text:='';

 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;

   -- Dynamically generate the CASE statements based on unit vs cost
   if $4 = 'unit'
   then
     -- For units, use quantity fields
     SELECT string_agg(
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_approved', 
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection 
       ORDER BY fiscal_year_month
     ) t;
   else
     -- For costs, use cost fields
     SELECT string_agg(
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
       'MAX(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_approved', 
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection 
       ORDER BY fiscal_year_month
     ) t;
   end if;

   -- Remove trailing comma and space
   v_dynamic_columns := trim(trailing ', ' from v_dynamic_columns);

   IF v_dynamic_columns IS NULL THEN
     OPEN $1 FOR SELECT 'No data in oms_receipt_projection table' AS message;
     RETURN $1;
   END IF;

   -- Build the complete SQL with dynamic columns
   v_receipts_projection_report_sql := 'SELECT * from (
	SELECT 
	    paf.article,
		  MAX(paf.l0_name) AS l0_name,
		  MAX(paf.l1_name) AS l1_name,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l3_name) AS l3_name,
	    MAX(paf.l4_name) AS l4_name,
	    MAX(paf.vendor_id) AS vendor_id,
		  MAX(paf.vendor_desc) AS vendor_desc,
	    MAX(paf.style_name) AS style_name,
	    ' || v_dynamic_columns || '
	    FROM inventory_smart.oms_receipt_projection orp
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = orp.product_code and paf.ordering = ''Y''
		GROUP BY paf.article
		ORDER BY paf.article
	)Z
   '||v_meta_cls;       
   
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN v_receipts_projection_report_sql;
 end
 $function$
;