--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_article_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_1_1 labels:MTP-83719
--comment: MTP-83719
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_article_store_size_list(input refcursor, jsonb, jsonb, integer, integer);
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_article_store_size_list(input refcursor, jsonb, jsonb, integer, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_article_store_size_list(input refcursor, jsonb, jsonb, integer, integer, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
		declare
 		_query_pa text := '';
 		_query_sa text := '';
	 	_filter_query text := '';
	 	_sort_query text;
	 	_overall_search TEXT:= '';
	 	_limit_query text := '';
	 	_query_combine text := '';
	 	 _query_combine_format text := '';
        _query_combine_count_format text := '';
        _query_combine_count text := '';
        _ph_sort text ;
        _ph_search text;
        _initial_limit int;
        _limit int;
        _offset int;
        _sub_limit int;
        _sub_offset int;
        _dummy text;
        _sa_search text;
        _formatter jsonb;
        _fiscal_year_week int;
	
	BEGIN
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
        
       SELECT (CAST($5 AS TEXT) || LPAD(CAST($4 AS TEXT), 2, '0'))::INTEGER into _fiscal_year_week;
       
 		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT article, product_description, model_description, color, style_color_id, size, product_code, supersede_flag, l0_name ,l1_name,l2_name,l3_name, l4_name, brand
                FROM "global".product_attributes_filter paf {pa_filter} {pa_search}
                {limit_final}
			) sq
		$$;
        _query_combine_format := $$
            WITH paf as materialized(
                SELECT article, product_description, model_description, color, style_color_id, size, product_code, supersede_flag, l0_name ,l1_name,l2_name,l3_name, l4_name, brand
                FROM "global".product_attributes_filter paf {pa_filter} {pa_search}
                order by product_code
                {limit_final}
            ),
            saf as materialized(
                SELECT store_code, store_name, retail_facility_code FROM global.store_attributes_filter
                {sa_filter} {sa_search} and special_classification != 'WHS'
            ),
            lost_sales_aggregated as(
            	select
            		product_hierarchy,
            		ls.product_code,
					store_code,
					fiscal_year,
					fiscal_week,
					ROUND(COALESCE(SUM(lost_sales), 0)::numeric, 2) lost_sales,
					ROUND(COALESCE(SUM(lost_units), 0)::numeric, 2) lost_units,
					ROUND(COALESCE(SUM(wos_pred), 0)::numeric, 2) wos_pred,
					ROUND(COALESCE(SUM(opening_inventory), 0)::numeric, 2) week_open_balance,
					ROUND(COALESCE(SUM(quantity), 2)::numeric, 2) total_quantity,
					ROUND(COALESCE(AVG(cluster_avg_sales), 0)::numeric, 2) cluster_avg_sales,
					ROUND(COALESCE(SUM(line_amount), 0)::numeric, 2) line_amount
				from inventory_smart.loss_units_sku_store_level ls ---these two joins should be swapped to get the index benefit but we will also
				join paf on paf.article = ls.product_hierarchy and paf.product_code = ls.product_code--need to create one index on ls
				join saf using(store_code)
				where fiscal_year_week = {fiscal_year_week}
				group by 1, 2, 3, 4, 5
            ),
			lost_sales_data as (
				SELECT
					product_hierarchy article,
					''''||size as size,
					lsa.store_code,
					fiscal_year,
					fiscal_week,
					product_description,
					model_description,
					color,
					style_color_id,
					l0_name,
					l1_name,
					l2_name,
					l3_name,
					l4_name,
					brand,
					supersede_flag,
					retail_facility_code,
					saf.store_name,
					lsa.product_code,
					concat(article,'-',store_code,'-',size) as key,
					lost_sales,
					lost_units,
					wos_pred,
					week_open_balance,
					total_quantity,
					cluster_avg_sales,
					line_amount
				FROM lost_sales_aggregated lsa
				join paf on paf.article = lsa.product_hierarchy and paf.product_code = lsa.product_code
				JOIN saf USING(store_code)
				{sub_limit_final}
			),
			final_result as (
          		select *,
        			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
				from lost_sales_data
				order by sub_offset
          	)
 			SELECT {select} FROM final_result
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