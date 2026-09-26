--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_receipts_projection_agg_report_3 runOnChange:true stripComments:false splitStatements:false context:MTP-91441 labels:MTP-94566-b
--comment: Show all months between min and max from oms_vendor_projection using fiscal_date_mapping
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
	   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
	                                                     ,'product_code'
	                                                     , $2
	                                                     );
     v_receipts_projection_report_sql := '
	    WITH month_range AS (
	        SELECT 
	            MIN(fiscal_year_month) as min_month,
	            MAX(fiscal_year_month) as max_month
	        FROM inventory_smart.oms_receipt_projection
	    ),
	    all_months AS (
	        SELECT DISTINCT
	            fiscal_year_month,
	            fiscal_month_name,
	            fiscal_year
	        FROM global.fiscal_date_mapping fdm
	        CROSS JOIN month_range mr
	        WHERE fdm.fiscal_year_month BETWEEN mr.min_month AND mr.max_month
	    )
	    SELECT
	        am.fiscal_year_month,
	        am.fiscal_month_name,
	        am.fiscal_year,
	        COALESCE(sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.receipt_quantity ELSE 0 END), 0) as roq,
	        COALESCE(sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.receipt_quantity_cost ELSE 0 END), 0) as roq_cost,
	        COALESCE(sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.approved_quantity ELSE 0 END), 0) as approved_quantity,
	        COALESCE(sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.approved_quantity_cost ELSE 0 END), 0) as approved_cost,
	        COALESCE(sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.committed_quantity ELSE 0 END), 0) as committed_quantity,
	        COALESCE(sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.committed_quantity_cost ELSE 0 END), 0) as committed_cost
	    FROM all_months am
	    LEFT JOIN inventory_smart.oms_receipt_projection orp 
	        ON am.fiscal_year_month = orp.fiscal_year_month
	    LEFT JOIN ('||v_pa_sql||') paf 
	        ON orp.product_code = paf.product_code
	        AND paf.ordering = ''Y''
	    GROUP BY 1,2,3
	    ORDER BY 1,2,3';
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
	END;
$function$
;
