--liquibase formatted sql
--changeset liquibase:get_oms_dropship_report_agg runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_dropship_report_agg
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_dropship_report_agg(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_dropship_report_agg(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_dropship_report_sql  text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_dropship_report_sql := '
        SELECT
	        odsfp.fiscal_year_month,
            sum(predictions) as predictions,
			sum(adjusted_predictions) as adjusted_predictions,
			sum(total_cost) as total_cost,
			sum(adjusted_total_cost) as adjusted_total_cost
	    FROM inventory_smart.oms_drop_ship_forecast_projection odsfp
	    INNER JOIN ('||v_pa_sql||') paf ON odsfp.product_code = paf.product_code
	    GROUP BY 1
        ORDER BY 1';       
   
   raise notice 'v_dropship_report_sql %',v_dropship_report_sql;
   open $1 for execute v_dropship_report_sql;
   RETURN $1;
 end
 $function$
;
