--liquibase formatted sql
--changeset liquibase:estimate_excess_inv_article_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-65972
--comment: MTP-65972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_excess_inv_article_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_excess_inv_article_list_download(refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
		declare
		_query_pa text := '';
		_query_sa text := '';
		_fiscal_year_week int;
		_query_combine text := '';
	begin
		_query_pa := global.form_main_table_filters(
 		  'product_attributes_filter',
 		  $2
 		);
 		_query_sa := global.form_main_table_filters(
 		  'store_attributes_filter',
 		  $3
 		);
 	
 		SELECT (CAST($6 AS TEXT) || LPAD(CAST($5 AS TEXT), 2, '0'))::INTEGER into _fiscal_year_week;
 	
 		_query_combine := $$
			WITH paf as (
				SELECT distinct article, supersede_flag, model_description, brand, product_description, color, style_color_id
                FROM global.product_attributes_filter paf
                $$||_query_pa||$$
				ORDER BY article
			),
			saf as (
                SELECT store_code FROM global.store_attributes_filter
                $$||_query_sa||$$
			),
			excess_data_aggregated as(
            	select
            		product_hierarchy article,
					string_agg(distinct product_description, ',') as product_description, 
					string_agg(distinct color, ',') as color, 
					string_agg(distinct style_color_id, ',') as style_color_id, 
					COUNT(store_code) store_count,
					coalesce(SUM(min_stock), 0) as min_stock,
 					coalesce(SUM(oh), 0) as total_oh,
 					coalesce(SUM(oo), 0) as total_oo,
 					coalesce(SUM(it), 0) as total_it,
 					coalesce(sum(coalesce(week_qty, 0)), 0) as total_week_qty,
 					coalesce(ROUND(SUM(ros::numeric),2), 0) as total_ros,
 					coalesce(ROUND(AVG(target_wos::numeric))) as total_target_wos,
 					coalesce(ROUND(AVG(wos_pred::numeric))) as total_wos_pred,
 					coalesce(ROUND(SUM(excess_inv::numeric),2), 0) as total_execss_inv,
 					coalesce(ROUND(SUM(excess_inv_cost::numeric),2), 0) as total_excess_inv_cost,
 					coalesce(ROUND(SUM(tot_inv::numeric),2), 0) as sum_tot_inv
 				from inventory_smart.excess_units eu TABLESAMPLE SYSTEM (1)
 				join paf ON paf.article = eu.product_hierarchy
 				JOIN saf USING(store_code)
 				where fiscal_year_week = $$||_fiscal_year_week||$$
 				group by 1
            ),
			excess_inv as (
				SELECT
					edu.article,
					supersede_flag,
					brand,
					$$||$6||$$ as fiscal_year,
					$$||$5||$$ as fiscal_week,
					model_description,
					edu.product_description, 
					edu.color, 
					edu.style_color_id, 
					store_count,
					min_stock,
 					total_oh,
 					total_oo,
 					total_it,
 					total_week_qty,
 					total_ros,
 					total_target_wos,
 					total_wos_pred,
 					total_execss_inv,
 					total_excess_inv_cost,
 					sum_tot_inv
				FROM excess_data_aggregated edu
				JOIN paf using(article)
			)
			SELECT count(*)*100 as total_count FROM excess_inv;
			$$;
	raise notice ' %', _query_combine;
	open $1 for execute _query_combine;
    RETURN $1;
	END;
$function$
;