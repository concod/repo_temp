--liquibase formatted sql
--changeset aman.pareek:get_oms_receipts_projection_report_download1 runOnChange:true stripComments:false splitStatements:false context:MTP-75288 labels:MTP-827821-1
--comment: MTP-827821
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_receipts_projection_report_download(refcursor, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION oms.get_oms_receipts_projection_report_download(input refcursor, jsonb, jsonb, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
   v_meta_cls             text:='';
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

   -- Dynamically generate the CASE statements based on unit vs cost
   if $4 = 'unit'
   then
     SELECT string_agg(
       'sum(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'sum(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_committed, ' ||
       'sum(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_approved',
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM oms.oms_receipt_projection 
       ORDER BY fiscal_year_month
     ) t;
   else
     SELECT string_agg(
       'sum(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity_cost ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'sum(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity_cost ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_committed, ' ||
       'sum(COALESCE(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity_cost ELSE 0 END,0)) as fym' || fiscal_year_month::text || '_approved',
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
	    paf.article,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l1_name) AS l1_name,
	    MAX(paf.l2_name) AS l2_name,
	    MAX(paf.l3_name) AS l3_name,
		--MAX(paf.season) AS season,
	    --MAX(paf.class) AS class,
		MAX(paf.product_description) AS product_description,
		MAX(orp.vendor_code) AS vendor_code,
	    MAX(orp.vendor_name) AS vendor_name,
	    ' || v_dynamic_columns || '
	    FROM oms.oms_receipt_projection orp
		JOIN ('||v_pa_sql||') paf
		ON paf.product_code = orp.product_code and paf.ordering = ''Y''
		GROUP BY 1
		ORDER BY 1
	)Z
  '||v_meta_cls;       
   
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN v_receipts_projection_report_sql;
 end
 $function$
;
