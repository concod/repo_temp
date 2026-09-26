--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_receipts_projection_agg_report_2 runOnChange:true stripComments:false splitStatements:false context:MTP-91441 labels:MTP-94566-b
--comment: Added SP for OMS receipts projection agg report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS oms.get_oms_receipts_projection_agg_report(refcursor, jsonb);
CREATE OR REPLACE FUNCTION oms.get_oms_receipts_projection_agg_report(input refcursor, jsonb)
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
	    SELECT
	        orp.fiscal_year_month,
			orp.fiscal_month_name,
			orp.fiscal_year,
	        sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.receipt_quantity ELSE 0 END) as roq,
			sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.receipt_quantity_cost ELSE 0 END) as roq_cost,
			sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.approved_quantity ELSE 0 END) as approved_quantity,
			sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.approved_quantity_cost ELSE 0 END) as approved_cost,
			sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.committed_quantity ELSE 0 END) as committed_quantity,
			sum(CASE WHEN paf.product_code IS NOT NULL THEN orp.committed_quantity_cost ELSE 0 END) as committed_cost
	    FROM oms.oms_receipt_projection orp
	    LEFT JOIN ('||v_pa_sql||') paf ON orp.product_code = paf.product_code AND paf.ordering = ''Y''
	    GROUP BY 1,2,3
	    ORDER BY 1,2,3';
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
	END;
$function$
;
