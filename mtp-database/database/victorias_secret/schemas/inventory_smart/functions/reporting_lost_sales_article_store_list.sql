--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_article_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_4 labels:MTP-23605
--comment: pre-query pagination
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_article_store_list(input refcursor, jsonb, jsonb, integer, integer);
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_article_store_list(input refcursor, jsonb, jsonb, integer, integer, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_article_store_list(input refcursor, jsonb, jsonb, integer, integer, jsonb)
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
		v_gen_random_uuid text  := gen_random_uuid()::varchar;
	
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
                SELECT article, product_description, color, style_color_id
                FROM global.product_attributes_filter {pa_filter} {pa_search} and active
                group by 1,2,3,4
                order by article
                {limit_final}
			) sq
		$$;
        _query_combine_format := $$
            WITH paf as (
                SELECT article, product_description, color, style_color_id
                FROM global.product_attributes_filter
                {pa_filter} {pa_search} and active
                group by 1,2,3,4
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
					store_code,
					fiscal_year,
					fiscal_week,
					product_description,
					color,
					style_color_id,
					retail_facility_code,
					saf.store_name,
					concat(article,'-',store_code) as key,
					COALESCE(SUM(lost_sales), 0) lost_sales,
					COALESCE(SUM(lost_units), 0) lost_units,
					COALESCE(SUM(opening_inventory), 0) week_open_balance,
					COALESCE(SUM(quantity), 0) total_quantity,
					COALESCE(AVG(cluster_avg_sales), 0) cluster_avg_sales,
					COALESCE(SUM(line_amount), 0) line_amount
			FROM paf
			LEFT JOIN (select * from inventory_smart.loss_units WHERE fiscal_week = {fiscal_week} AND fiscal_year = {fiscal_year}) lu 
			ON paf.article = lu.product_hierarchy
			join saf USING(store_code)
			--WHERE fiscal_week = '%3$s' AND fiscal_year = '%4$s'
			GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10
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
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_lost_sales_article_store_list', 'Before return',_query_combine_format,jsonb_build_object('$2', $2, '$3', $3,'$4', $4,'$5', $5,'$6', $6));	
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_lost_sales_article_store_list', 'Before return',_query_combine_count_format,jsonb_build_object('$2', $2, '$3', $3,'$4', $4,'$5', $5,'$6', $6));	
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_lost_sales_article_store_list', 'Before return',_formatter,jsonb_build_object('$2', $2, '$3', $3,'$4', $4,'$5', $5,'$6', $6));
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;