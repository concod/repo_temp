--liquibase formatted sql
--changeset kailash.kangne:get_oms_forecast_projection_agg_report_1 runOnChange:true stripComments:false splitStatements:false context:MTP-75288 labels:MTP-94566-b
--comment: MTP-75288
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
	   v_pa_sql := inventory_smart.form_main_table_filters('ph_master',$2);
    v_pa_sql := v_pa_sql || ' and ordering = ''Y''';
      v_forecast_projection_report_sql := '
		    SELECT
		        ofp.fiscal_year_month,
				ofp.fiscal_month_name,
				ofp.fiscal_year,
		        sum(store_forecast_pred) as predictions,
				sum(store_forecast_pred_cost) as total_cost
		    FROM inventory_smart.oms_vendor_projection ofp
		    INNER JOIN (select distinct on (l4_name) l4_name from "global".product_attributes_filter '||v_pa_sql||') paf ON ofp.product_code = paf.l4_name
		    GROUP BY 1,2,3
		    ORDER BY 1,2,3'; 
   raise notice 'v_forecast_projection_report_sql %',v_forecast_projection_report_sql;
   open $1 for execute v_forecast_projection_report_sql;
   RETURN $1;
	END;
$function$
;
