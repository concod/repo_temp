--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_receipts_projection_agg_report_2 runOnChange:true stripComments:false splitStatements:false context:MTP-91441 labels:MTP-MTP-91441
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
	   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
	                                                     ,'product_code'
	                                                     , $2
	                                                     );
      v_receipts_projection_report_sql := '
		    SELECT
		        orp.fiscal_year_month,
		        sum(receipt_quantity) as roq,
				sum(receipt_quantity_cost) as roq_cost,
				sum(approved_quantity) as approved_quantity,
				sum(approved_quantity_cost) as approved_cost,
				sum(committed_quantity) as committed_quantity,
				sum(committed_quantity_cost) as committed_cost
		    FROM inventory_smart.oms_receipt_projection orp
		    INNER JOIN ('||v_pa_sql||') paf ON orp.product_code = paf.product_code
			where paf.ordering = ''Y''
		    GROUP BY 1
		    ORDER BY 1'; 
   raise notice 'v_receipts_projection_report_sql %',v_receipts_projection_report_sql;
   open $1 for execute v_receipts_projection_report_sql;
   RETURN $1;
	END;
$function$
;
