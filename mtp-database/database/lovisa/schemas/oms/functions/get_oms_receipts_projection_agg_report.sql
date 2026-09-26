--liquibase formatted sql
--changeset nikhil.madhusudan@impactanalytics.co:get_oms_receipts_projection_agg_report_2 runOnChange:true stripComments:false splitStatements:false context:MTP-91441 labels:MTP-94566-b
--comment: MTP-91441 receipts projection report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_receipts_projection_agg_report(refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_receipts_projection_agg_report(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_receipts_projection_report_sql  text:='';
	BEGIN
	   v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
	   v_pa_sql := v_pa_sql || ' and ordering = ''Y''';
     v_receipts_projection_report_sql := '
	    SELECT
	        orp.fiscal_year_month,
			orp.fiscal_month_name,
			orp.fiscal_year,
	        sum(CASE WHEN paf.l4_name IS NOT NULL THEN orp.receipt_quantity ELSE 0 END) as roq,
			sum(CASE WHEN paf.l4_name IS NOT NULL THEN orp.receipt_quantity_cost ELSE 0 END) as total_cost
	    FROM inventory_smart.oms_receipt_projection orp
	    LEFT JOIN (select distinct on (l4_name) l4_name from "global".product_attributes_filter '||v_pa_sql||') paf ON orp.product_code = paf.l4_name
	    GROUP BY 1,2,3
	    ORDER BY 1,2,3';
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
	END;
$function$
;

