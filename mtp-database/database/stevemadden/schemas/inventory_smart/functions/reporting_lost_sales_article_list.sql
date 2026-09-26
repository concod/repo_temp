--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_article_list runOnChange:true stripComments:false splitStatements:false context:MTP-71177 labels:MTP-71177
--comment: MTP-71177 added style name
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_article_list(refcursor, jsonb, jsonb, int4, int4, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_article_list(input refcursor, jsonb, jsonb, integer, integer, jsonb)
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
	
	BEGIN
		SELECT * FROM inventory_smart.form_search_sort_clause($6, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
	raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($6, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
       
 		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT article, product_description,  color, style_color_id
                FROM global.product_attributes_filter {pa_filter} {pa_search} and active
                group by 1,2,3,4
                order by article
                {limit_final}
			) sq
		$$;
        _query_combine_format := $$
            WITH paf as (
                SELECT article, product_description, product_code, color, size,style_color_id, l0_name ,l1_name,l2_name,l3_name, l4_name, style_name
                FROM global.product_attributes_filter
                {pa_filter} {pa_search} and active
                group by 1,2,3,4,5 ,6,7,8,9,10,11,12
                order by article
                {limit_final}
            ),
            saf as (
                SELECT * FROM global.store_attributes_filter
                {sa_filter} {sa_search} and special_classification != 'WHS'
            ),
			lost_sales_data as (
				SELECT
					product_hierarchy article,
					lu.fiscal_year,
					lu.fiscal_week,
					product_description,
					paf.product_code,
					paf.size,
					color,
					style_color_id,
					saf.store_code,
					saf.store_name,
					saf.channel,
					saf.s1_name,
					saf.s2_name,
					saf.s3_name,
					paf.l0_name,
					paf.l1_name,
					paf.l2_name,
					paf.l3_name,
					paf.l4_name,
					paf.style_name,
					product_hierarchy key,
					ROUND(COALESCE(SUM(lu.lost_sales), 0)::numeric, 2) lost_sales,
					ROUND(COALESCE(SUM(lu.lost_units), 0)::numeric, 2) lost_units,
					ROUND(COALESCE(SUM(lu.quantity), 0)::numeric, 2) units_sold,
					ROUND(COALESCE(SUM(lu.opening_inventory), 0)::numeric, 2) week_open_balance,
					ROUND(COALESCE(SUM(lu.quantity), 0)::numeric, 2) total_quantity,
					ROUND(COALESCE(AVG(lu.cluster_avg_sales), 0)::numeric, 2) cluster_avg_sales,
					ROUND(COALESCE(SUM(lu.line_amount), 0)::numeric, 2) line_amount
				FROM paf
				left JOIN (select * from inventory_smart.loss_units WHERE fiscal_week = {fiscal_week} AND fiscal_year = {fiscal_year}) lu 
				ON paf.product_code = lu.product_hierarchy
				JOIN saf on saf.store_code=lu.store_code
				--WHERE fiscal_week = '%3$s' AND fiscal_year = '%4$s'
				GROUP BY 1, 2, 3, 4, 5, 6, 7, 8 ,9,10,11,12,13,14,15,16,17,18,19,20,21
				{sub_limit_final}
			),
			final_result as (
          		select *,
        			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
				from lost_sales_data
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
            'fiscal_year', $5
        );
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;
