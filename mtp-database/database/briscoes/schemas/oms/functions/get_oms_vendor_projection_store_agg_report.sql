--liquibase formatted sql
--changeset cascade:get_oms_vendor_projection_store_agg_report_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:vendor_projection_store
--comment: Initial creation of vendor projection store aggregated report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_vendor_projection_store_agg_report(refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_vendor_projection_store_agg_report(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 declare
   v_pa_sql               text:='';
   v_sa_sql               text:='';
   v_vendor_projection_report_sql  text:='';
	BEGIN
	   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes', 'product_code', $2);
	   v_sa_sql := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
	   
      v_vendor_projection_report_sql := '
		    SELECT
		        ovp.fiscal_year_month,
				ovp.fiscal_month_name,
				ovp.fiscal_year,
		        sum(order_quantity) as roq,
				sum(order_quantity_cost) as total_cost
		    FROM inventory_smart.oms_vendor_projection_store ovp
		    INNER JOIN ('||v_pa_sql||') paf ON ovp.product_code = paf.product_code
			WHERE paf.ordering = ''Y''
			AND ovp.store_code IN (SELECT store_code FROM global.store_attributes_filter '||v_sa_sql||')
		    GROUP BY 1, 2, 3
		    ORDER BY 1, 2, 3'; 
   raise notice 'v_vendor_projection_report_sql %',v_vendor_projection_report_sql;
   open $1 for execute v_vendor_projection_report_sql;
   RETURN $1;
	END;
$function$
;
