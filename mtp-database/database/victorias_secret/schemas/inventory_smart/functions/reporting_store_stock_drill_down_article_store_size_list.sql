--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_article_store_size_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0_3 labels:MTP-23782
--comment: added key and missing columns
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_article_store_size_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_article_store_size_list(input refcursor, jsonb, jsonb, jsonb)
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
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
	raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
 		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
       
 		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT * FROM global.product_attributes_filter {pa_filter} {pa_search} and active
                {limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH paf as (
                SELECT article, color, l0_name, l1_name, l2_name, l3_name, l4_name, product_description, style_color_id, size, product_code
                FROM global.product_attributes_filter
                {pa_filter} {pa_search} and active
                {limit_final}
            ),
            saf as (
                SELECT * FROM global.store_attributes_filter
                {sa_filter} {sa_search} and special_classification != 'WHS'
            ),
           ssd_data as (
          	select 
          	paf.article, 
          	color,
			paf.l0_name,
			paf.l1_name,
			paf.l2_name,
			paf.l3_name,
			paf.l4_name,
			store_status,
			style_color_status,
			paf.product_description,
			paf.style_color_id,	
			ssd.store_code, 
			ssd.channel,
			retail_facility_code,
			store_name,
			asg.grade,
			climate,
			region,
			size,
			ssd.product_code,
			sum(coalesce(wos_predicted,0)) as wos_predicted,
			sum(coalesce(store_avail_oh, 0)) as oh,
			sum(coalesce(store_in_transit, 0)) as it,
			sum(coalesce(oo,0)) as oo,
			sum(coalesce(tot_inv,0)) as tot_inv,
			sum(coalesce(size_integrity,0))*100 as size_integrity,
			sum(coalesce(lw_qty,0)) as lw_qty
			from paf
			join inventory_smart.store_stock_drilldown ssd using(article, product_code)
			join saf using (store_code, channel)
			join inventory_smart.article_store_grade asg using(article, store_code)
			group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20
			{sub_limit_final}
          ),
          total_inventory as (
          select
          article,
          store_code,
          ssd.product_code,
          case WHEN oh < 0 THEN True ELSE False end as negative_inventory_oh,
          sum(oh + oo + it) as total_inventory
          from ssd_data ssd
          group by 1,2,3,4
          ),
          dc_data as (
     		select 
     		article,
     		ssd2.store_code,
     		ssd.product_code,
     		dc."name" dc_name,
     		coalesce(sum(ssd2.oh_dc), 0) as dc_oh
     		from ssd_data ssd
     		left join inventory_smart.store_stock_drilldown ssd2 using(article, product_code, channel)
     		join global.distribution_centres dc on ssd2.store_code = dc.dc_code::text
     		group by 1,2,3,4
     	),
           dc_data_aggregated as (
          	select 
          		article,
          		store_code,
          		product_code,
          		json_object_agg(concat('dc_', dc_name), dc_oh) AS dc_oh_mapped,
          		sum(coalesce(dc_oh,0)) as bulk_remaining
          		from dc_data
          		group by 1,2,3
          		),
          	final_result as (
          	select *,
          			concat(article, '-', store_code, '-', size) as key,
          			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
			from ssd_data
          	left join dc_data_aggregated using(article, store_code, product_code)
          	join total_inventory using(article, store_code, product_code)
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
            'sub_offset', _sub_offset
        );
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_store_stock_drill_down_article_store_size_list', 'Before Return',_query_combine_format,jsonb_build_object('$2', $2, '$3', $3,'$4', $4));	
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_store_stock_drill_down_article_store_size_list', 'Before Return',_query_combine_count_format,jsonb_build_object('$2', $2, '$3', $3,'$4', $4));	
        perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.reporting_store_stock_drill_down_article_store_size_list', 'Before Return',_formatter,jsonb_build_object('$2', $2, '$3', $3,'$4', $4));
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;