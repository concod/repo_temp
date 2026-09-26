--liquibase formatted sql
--changeset liquibase:reporting_excess_inv_article_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_4 labels:MTP-24000
--comment: added unique key
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inv_article_list(input refcursor, jsonb, jsonb, integer, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inv_article_list(input refcursor, jsonb, jsonb, integer, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_fiscal_week text := $4;
		_fiscal_year text := $5;
		_query_table_filters text := '';
		_query_combine text := '';
		_table_query text := '';
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
	begin 		
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		_table_query := global.form_table_query($6);
		_query_combine := FORMAT($$
			with excess_inv as (
				SELECT
					product_hierarchy article,
					fiscal_year,
					fiscal_week,
					product_description,
					color,
					style_color_id,
					COUNT(store_code) store_count,
					-- SUM(min_stock) as min_stock,
 					SUM(oh) as total_oh,
 					SUM(oo) as total_oo,
 					SUM(it) as total_it,
 					SUM(week_qty) as total_week_qty,
 					ROUND(SUM(ros::numeric),2) as total_ros,
 					ROUND(SUM(target_wos::numeric),2) as total_target_wos,
 					ROUND(SUM(wos_pred::numeric),2) as total_wos_pred,
 					ROUND(SUM(excess_inv::numeric),2) as total_execss_inv,
 					ROUND(SUM(excess_inv_cost::numeric),2) as total_excess_inv_cost,
 					ROUND(SUM(tot_inv::numeric),2) as sum_tot_inv
			FROM (
				SELECT article, product_description, color, style_color_id
				FROM global.product_attributes_filter %1$s AND active
				GROUP BY 1, 2, 3, 4
	 		) paf
			LEFT JOIN inventory_smart.excess_units lu ON paf.article = lu.product_hierarchy
			LEFT JOIN (
				SELECT store_code, retail_facility_code, store_name
				FROM global.store_attributes_filter %2$s AND active
			) saf USING(store_code)
			WHERE fiscal_week = '%3$s' AND fiscal_year = '%4$s' 
			GROUP BY 1, 2, 3, 4, 5, 6
			
			)
			select * from excess_inv %5$s;
		$$, _query_pa, _query_sa, _fiscal_week, _fiscal_year, _table_query);
		raise notice '%', _query_combine;
		OPEN $1 FOR EXECUTE _query_combine;
        perform  global.sp_log(v_gen_random_uuid,'inventory_smart.reporting_excess_inv_article_list', 'Before RETURN',_query_combine,jsonb_build_object('$2', $2, '$3', $3, '_fiscal_week',$4, '_fiscal_year',$5, '$6',$6));
		RETURN $1;
	end
$function$
;