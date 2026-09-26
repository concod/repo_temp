--liquibase formatted sql
--changeset aman.pareek:get_oms_receipts_projection_vendor_agg_report3 runOnChange:true stripComments:false splitStatements:false context:MTP-75288 labels:MTP-1116121v2
--comment: MTP-1116121v2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_receipts_projection_vendor_agg_report(refcursor, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION oms.get_oms_receipts_projection_vendor_agg_report(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
   v_fiscal_year_months   text:='';
   v_meta_cls             text:='';
   v_col_value            text:='';
   v_dynamic_columns      text:='';

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
     SELECT string_agg(
       'SUM(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'SUM(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_committed, ' ||
       'SUM(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_approved',
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM oms.oms_receipt_projection 
       ORDER BY fiscal_year_month
     ) t;
   else
     SELECT string_agg(
       'SUM(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity_cost ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'SUM(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity_cost ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_committed, ' ||
       'SUM(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity_cost ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_approved',
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM oms.oms_receipt_projection 
       ORDER BY fiscal_year_month
     ) t;
   end if;

   v_dynamic_columns := trim(trailing ', ' from v_dynamic_columns);

   IF v_dynamic_columns IS NULL THEN
     OPEN $1 FOR SELECT 'No data in oms_receipt_projection table' AS message;
     RETURN $1;
   END IF;

   v_receipts_projection_report_sql := 'SELECT * from (
	SELECT 
		orp.vendor_code AS vendor_code,
	    orp.vendor_name AS vendor_name,
	    ' || v_dynamic_columns || '
	    FROM oms.oms_receipt_projection orp
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = orp.product_code and paf.ordering = ''Y''
		GROUP BY 1,2
		ORDER BY 1,2
	)Z
  '||v_meta_cls;       
     
   
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
 end
 $function$
;
