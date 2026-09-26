--liquibase formatted sql
--changeset liquibase:get_oms_vendor_projection_agg_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_oms_vendor_projection_agg_report
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_vendor_projection_agg_report(input refcursor, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_vendor_projection_agg_report(input refcursor, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_vendor_projection_report_sql  text:='';
	BEGIN
	   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
	                                                     ,'product_code'
	                                                     , $2
	                                                     );
      v_vendor_projection_report_sql := '
		    SELECT
		        ovp.fiscal_year_month,
		        sum(roq_unconstrained) as roq,
				sum(total_cost) as total_cost
		    FROM inventory_smart.oms_vendor_projection ovp
		    INNER JOIN ('||v_pa_sql||') paf ON ovp.product_code = paf.product_code
		    GROUP BY 1
		    ORDER BY 1'; 
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN $1;
	END;
$function$
;
