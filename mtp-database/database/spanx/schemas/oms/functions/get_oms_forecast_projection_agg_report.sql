--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:get_oms_forecast_projection_agg_report runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-67255
--comment: MTP-67255 Vendor projections report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_forecast_projection_agg_report(refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_forecast_projection_agg_report(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_forecast_projection_report_sql  text:='';
	BEGIN
	   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
	                                                     ,'product_code'
	                                                     , $2
	                                                     );
      v_forecast_projection_report_sql := '
		    SELECT
		        ofp.fiscal_year_month,
		        sum(store_forecast_pred) as predictions,
				sum(store_forecast_pred_cost) as total_cost
		    FROM inventory_smart.oms_vendor_projection ofp
		    INNER JOIN ('||v_pa_sql||') paf ON ofp.product_code = paf.product_code
		    GROUP BY 1
		    ORDER BY 1'; 
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN $1;
	END;
$function$
;
