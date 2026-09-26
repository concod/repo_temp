--liquibase formatted sql
--changeset liquibase:estimate_excess_inv_article_store_list_download runOnChange:true stripComments:false splitStatements:false context:Release_1_0_1 labels:MTP-65972
--comment: MTP-65972
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.estimate_excess_inv_article_store_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.estimate_excess_inv_article_store_list_download(input refcursor, jsonb, jsonb, jsonb, integer, integer, date, date)
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
				SELECT article, product_description, model_description, color, style_color_id, supersede_flag, brand
                FROM global.product_attributes_filter $$||_query_pa||$$
				GROUP BY 1, 2, 3, 4, 5, 6,7
				ORDER BY article
			),
			saf as (
                SELECT * FROM global.store_attributes_filter
                $$||_query_sa||$$
			),
			excess_data_aggregated as(
            	select
            		product_hierarchy article,
            		store_code,
            		coalesce(SUM(min_stock), 0) as min_stock,
            	    coalesce(SUM(oh), 0) as total_oh,
            	    coalesce(SUM(oo), 0) as total_oo,
            	    coalesce(SUM(it), 0) as total_it,
            	    coalesce(SUM(week_qty), 0) as total_week_qty,
            	    coalesce(ROUND(SUM(ros::numeric),2), 0) as total_ros,
            	    coalesce(ROUND(AVG(target_wos::numeric))) as total_target_wos,
 					coalesce(ROUND(AVG(wos_pred::numeric))) as total_wos_pred,
            	    coalesce(ROUND(SUM(excess_inv::numeric),2), 0) as total_execss_inv,
            	    coalesce(ROUND(SUM(excess_inv_cost::numeric),2), 0) as total_excess_inv_cost,
            	    coalesce(ROUND(SUM(tot_inv::numeric),2), 0) as sum_tot_inv
            	from inventory_smart.excess_units eu TABLESAMPLE SYSTEM (1)
            	join paf on paf.article = eu.product_hierarchy
            	join saf using(store_code)
            	WHERE fiscal_year_week = $$||_fiscal_year_week||$$
            	group by 1, 2
            ),
			excess_inv as (
            	SELECT
            	    article,
            	    edu.store_code,
            	    $$||$6||$$ as fiscal_year,
            	    $$||$5||$$ as fiscal_week,
            	    product_description,
					model_description,
            	    color,
            	    style_color_id,
            	    brand,
            	    supersede_flag,
            	    retail_facility_code,
            	    saf.store_name,
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
            	JOIN saf using(store_code)
			)
			SELECT count(*)*100 as total_count FROM excess_inv;
			$$;
		raise notice ' %', _query_combine;
		open $1 for execute _query_combine;
    	RETURN $1;
	END;
$function$
;