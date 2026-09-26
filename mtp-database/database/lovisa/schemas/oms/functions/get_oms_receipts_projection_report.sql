--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_receipts_projection_report_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:MTP-91441
--comment: MTP-91441 Receipts projections report.
--rollback: SELECT 1

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

 begin

    v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
    v_pa_sql := v_pa_sql || ' and ordering = ''Y''';

   if $3 <> '{}'
   then 
     v_meta_cls := global.form_table_query($3) ;
   end if;

   if $4 = 'unit'
   then
     SELECT string_agg(
       'sum(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'sum(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
       'sum(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity ELSE 0 END) as fym' || fiscal_year_month::text || '_approved',
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection 
       ORDER BY fiscal_year_month
     ) t;
   else
     SELECT string_agg(
       'sum(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.receipt_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_recommended, ' ||
       'sum(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.committed_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_committed, ' ||
       'sum(CASE WHEN orp.fiscal_year_month = ' || fiscal_year_month::text || ' THEN orp.approved_quantity_cost ELSE 0 END) as fym' || fiscal_year_month::text || '_approved',
       ', '
     ) INTO v_dynamic_columns
     FROM (
       SELECT DISTINCT fiscal_year_month 
       FROM inventory_smart.oms_receipt_projection 
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
	  paf.l4_name,
		MAX(paf.style_name) AS style_name,
		MAX(paf.vendor) AS vendor,
    MAX(paf.l1_name) AS l1_name,
	  MAX(paf.l2_name) AS l2_name,
	  MAX(paf.l3_name) AS l3_name,
		MAX(paf.range_usa) AS range_usa,
		MAX(paf.range_eu_uk) AS range_eu_uk,
		MAX(paf.range_au_nz) AS range_au_nz,
		MAX(paf.range_asia) AS range_asia,
		MAX(paf.range_africa) AS range_africa,
	    ' || v_dynamic_columns || '
	    FROM inventory_smart.oms_receipt_projection orp
		JOIN (select distinct on (l4_name) l4_name, l1_name, l2_name, l3_name, range_usa, range_asia, range_au_nz, range_eu_uk, range_africa, style_name, vendor from "global".product_attributes_filter '||v_pa_sql||') paf
		ON paf.l4_name = orp.product_code
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
