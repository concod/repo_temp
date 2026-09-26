--liquibase formatted sql
--changeset liquibase:reporting_excess_inv_article_store_size_list runOnChange:true stripComments:false splitStatements:false context:Release_1_1_1 labels:MTP-63140
--comment: MTP-63325-1
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inv_article_store_size_list(input refcursor, jsonb, jsonb, integer, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inv_article_store_size_list(input refcursor, jsonb, jsonb, integer, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    declare
        _query_pa text := '';
        _query_sa text := '';
        _query_combine_format text := '';
        _query_combine_count_format text := '';
        _ph_sort text ;
        _ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
        _sub_limit int;
        _sub_offset int;
        _dummy text;
        _sa_search text;
        _formatter jsonb;
        _fiscal_year_week int; 
       
    begin         
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
       raise notice 'val% % % % % % % ', _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset; 
       SELECT * FROM inventory_smart.form_search_sort_clause($6, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
        SELECT (CAST($5 AS TEXT) || LPAD(CAST($4 AS TEXT), 2, '0'))::INTEGER into _fiscal_year_week;
    
        _query_combine_count_format := $$
            SELECT COUNT(*)
            FROM
            (
                SELECT article, size, product_code, product_description, model_description, supersede_flag, color, style_color_id, brand
                FROM global.product_attributes_filter {pa_filter} {pa_search}
                {limit_final}
            ) sq
        $$;
        _query_combine_format := $$
            WITH paf as (
                SELECT article, size, product_code, product_description, model_description, supersede_flag, color, style_color_id, brand
                FROM "global".product_attributes_filter paf
                {pa_filter} {pa_search}
                order by product_code
                {limit_final}
            ),
            saf as (
                SELECT store_code,retail_facility_code, store_name, currency_cd
                FROM global.store_attributes_filter saf
                {sa_filter} {sa_search}
            ),
            excess_data_aggregated as(
            	select
            		product_code,
            		store_code,
            		min_stock,
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
            	from inventory_smart.excess_units_sku_store_level lu 
            	join paf using(product_code)
            	join saf using(store_code)
            	where fiscal_year_week = {fiscal_year_week}
            	group by 1, 2, 3
            ),
			excess_inv as (
            	SELECT
            	    article,
            	    size,
            	    eda.store_code,
            	    {fiscal_year} as fiscal_year,
            	    {fiscal_week} as fiscal_week,
            	    product_description,
            	    model_description,
            	    supersede_flag,
            	    color,
            	    style_color_id,
            	    brand,
            	    retail_facility_code,
            	    saf.store_name,
                    saf.currency_cd,
                    eda.product_code,
                    coalesce(min_stock, 0) as min_stock,
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
            	FROM excess_data_aggregated eda
            	JOIN paf on paf.product_code = eda.product_code 
            	JOIN saf using(store_code)
            	{sub_limit_final}
			),
			result as (
				SELECT *,
					   CONCAT(article, size, store_code) key,
					   {sub_offset} + ROW_NUMBER () OVER () as sub_offset,
						{limit} "limit",
						{offset} "offset",
						{sub_limit} sub_limit
				FROM excess_inv
				ORDER BY sub_offset 
			)
			SELECT {select} FROM result
        $$;

        _formatter = json_build_object(
            'pa_filter', _query_pa,
            'sa_filter', _query_sa,
            'pa_search', _ph_search,
            'sa_search', _sa_search,
            'limit', _limit,
            'sub_limit', _sub_limit,
            'offset', _offset,
            'sub_offset', _sub_offset,
        	'fiscal_week', $4,
        	'fiscal_year', $5,
        	'fiscal_year_week', _fiscal_year_week
        );
        RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;