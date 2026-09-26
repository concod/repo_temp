--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_article_list runOnChange:true stripComments:false splitStatements:false context:MTP-71177 labels:MTP-71177
--comment: MTP-71177 added style name
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_article_list(refcursor, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_article_list(input refcursor, jsonb, jsonb, jsonb)
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
        _channel text;
	
	BEGIN
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
	raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
        _channel := inventory_smart.get_channel_from_input($3);
       
 		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT article, product_description,product_code, size,l0_name, l1_name, l2_name, l3_name, l4_name
                FROM global.product_attributes_filter pm {pa_filter} {pa_search} and active
                group by 1,2,3,4,5,6,7,8
                order by article
                {limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH paf as (
                SELECT article, product_description, product_code,size,l0_name, l1_name, l2_name, l3_name, l4_name, style_name
                FROM global.product_attributes_filter pm
                {pa_filter} {pa_search} and active
                group by 1,2,3,4,5,6,7,8,9
                order by article
                {limit_final}
            ),
            saf as (
                SELECT * FROM global.store_attributes_filter
                {sa_filter} {sa_search}
            ),
          ssd_data as (
          	select 
          	paf.article, 
			paf.l0_name,
			paf.l1_name,
			paf.l2_name,
			paf.l3_name,
			paf.l4_name,
			paf.product_code,
			ssd.store_code, 
			ssd.channel,
			saf.store_name,
			ssd.store_grade,
			paf.size,
			paf.style_name,
			s1_name,
			s2_name,
			s3_name,
			store_status,
			case when style_color_status is not null then style_color_status
			else '-'
			end as style_color_status,
			string_agg(pm.article_status_tag, ', ') as article_status_tag,
			round(coalesce(avg(instock_pct)*100, 0)::numeric, 2) as instock_pct,
			sum(coalesce(wos_predicted_oh, 0)) as wos_predicted_oh,
			sum(coalesce(wos_predicted_oh_it, 0)) as  wos_predicted_oh_it,
			ROUND(coalesce(SUM((case when saf.special_classification = 'Outlet' then store_avail_oh + oo + store_in_transit else 0 end)) / SUM(case when saf.special_classification = 'Outlet' then store_level_prediction end ), 0):: numeric, 1):: text wos_predicted,
			sum(coalesce(store_avail_oh, 0)) as store_avail_oh,
			sum(coalesce(store_in_transit, 0)) as store_in_transit,
			sum(coalesce(oo,0)) as oo,
			sum(coalesce(tot_inv,0)) as total_inventory,
			ROUND(coalesce(AVG(case when saf.special_classification = 'Outlet' then size_integrity else null end), 0):: numeric, 2):: text size_integrity,
			sum(coalesce(lw_qty,0)) as lw_units,
			sum(coalesce(oh_dc,0)) as available_to_allocate
			from paf
			join (select * from inventory_smart.ph_master where channel = {channel})  pm using(article)
			join (select * from inventory_smart.store_stock_drilldown where channel = {channel}) ssd using(article)
			join saf ON saf.store_code = ssd.store_code AND saf.channel = ssd.channel
			join inventory_smart.article_store_grade asg on asg.store_code=saf.store_code and asg.article=ssd.article
			where special_classification != 'WHS'
			group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18
			{sub_limit_final}
          ),
          dc_data as (
          	select 
          		article,
          		ssd.store_code,
          		dc."name" dc_name,
          		coalesce(sum(ssd2.oh_dc), 0) as dc_oh		
          		from ssd_data ssd
          		left join (select * from inventory_smart.store_stock_drilldown where channel = {channel}) ssd2 using(article, channel)
          		join global.distribution_centres dc on ssd2.store_code = dc.linked_store_code::text
          		group by 1,2,3
          	),
           dc_data_aggregated as (
          	select 
          		article,
          		store_code,
          		json_object_agg(concat('dc_', dc_name), dc_oh) AS dc_oh_mapped,
          		sum(coalesce(dc_oh,0)) as bulk_remaining
          		from dc_data
          		group by 1,2
          		),
          	final_result as (
          		select sd.*,
          			dc_oh_mapped,
          			coalesce(bulk_remaining, 0) as bulk_remaining,
          			total_inventory,
          			concat(article, '-', store_code) as key,
          			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
			from ssd_data sd
          	left join dc_data_aggregated using(article, store_code)
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
            'channel', _channel
        );
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;
