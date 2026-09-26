--liquibase formatted sql
--changeset  konakandla.sujan runOnChange:true stripComments:false splitStatements:false context:Release_1_1_7 labels:MTP-87590,fix final cte,add limit and offset in final cte,add order by,fix cte to fetch paf data, add paf join
--comment: MTP-87590,fix final cte,add limit and offset in final cte,add order by,fix cte to fetch paf data,add paf join
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_dc_availability_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_dc_availability_list(input refcursor, jsonb, jsonb, jsonb)
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
       	_channel text := '';
        _limit int;
        _offset int;
        _sub_limit int;
        _sub_offset int;
        _dummy text;
        _sa_search text;
        _formatter jsonb;
	
	BEGIN
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
	raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
        _query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
       
       _channel := inventory_smart.get_channel_from_input($3);
       
       raise notice 'channel name %', _channel;
      
 		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT article, product_description,  model_description, style_color_id, brand, size, size_name, style, l1_name, l2_name, l3_name, l4_name, l1_id, l2_id, l3_id, l4_id, product_code, source_code
                FROM global.product_attributes_filter {pa_filter} {pa_search} and active
                {limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH paf as materialized(
                SELECT article, product_description, model_description, style_color_id, brand, size, size_name, style, l1_name, l2_name, l3_name, l4_name, l1_id, l2_id, l3_id, l4_id, product_code,supersede_flag, source_code               
                FROM global.product_attributes_filter
                {pa_filter} {pa_search} and active
				order by product_code
                {limit_final}
            ),
            saf as materialized (
                SELECT store_code, channel, country, special_classification FROM global.store_attributes_filter
                {sa_filter} {sa_search} and active
            ),
			ssd_fdata as materialized( select 
                    product_code,
                    country,
                    dc_code,
                    round(coalesce(instock_pct::NUMERIC, 0), 2) as instock_pct,
                    round(coalesce(instock_pct_details::NUMERIC, 0), 2) as instock_pct_details
                from
                inventory_smart.store_stock_drilldown ssd
                join "global".store_attributes_filter using(store_code)
                where product_code in (select product_code from paf)
                and special_classification = 'WHS'
                and ssd.channel in (select channel from saf)
            )
            ,store_on_hand as (
             	select product_code, article, saf.channel, size, sum(li.oh) as oh
                from saf
                join inventory_smart.latest_inventory li using(store_code, channel)
                join paf using(product_code)
                where special_classification != 'WHS'
                group by 1,2,3,4
            ),
            dc_data_latest as (
            	SELECT 
            		article,
					sdau.product_code,
					sdau.size,
					sdau.channel,
					dc_code,
					dc.name AS dc_name,
					SUM(oh) AS dc_oh
            		FROM 
            		global.distribution_centres dc
            		join inventory_smart.sku_dc_available_units('{}', (SELECT ARRAY_AGG(distinct article) FROM paf)) sdau using(dc_code)
            		join paf using (product_code,article,size)
            		where channel =  {channel}
            		group by article, sdau.product_code, sdau.size, sdau.channel, dc_code, dc.name
            ),
			dc_paf_data as (select 
          			pf.article,
          	        l1_name, 
					l2_name, 
					l3_name, 
					l4_name,		
					l1_id, 
					l2_id, 
					l3_id, 
					pf.size,
					l4_id,
					source_code AS source,
					size_name,
					channel,
					dc_code,
					dc_name,
					dc_oh,
					brand,
					product_code,
					style_color_id,
					product_description,
					model_description,
					style,
					supersede_flag
			from global.product_attributes_filter pf 
			join dc_data_latest using(product_code)
          ),

            final_result_initial as (
            	select
            		dd.article, 
					dd.product_code, 
					dd.size, 
					dd.channel,
        			dc_code, 
					dc_name, 
					dc_oh,
        			COALESCE(soh.oh, 0) AS oh,
					l1_name, 
					l2_name, 
					l3_name, 
					l4_name,		
					l1_id, 
					l2_id, 
					l3_id, 
					l4_id,
					source,
					size_name,
					brand,
					style_color_id,
					product_description,
					model_description,
					style,
					supersede_flag,
					0 + ROW_NUMBER () OVER () as sub_offset,
					CONCAT(dd.article, dd.size, dc_name) as key
            		from dc_paf_data dd
            		LEFT JOIN store_on_hand soh USING (article, product_code, size, channel)
            		{sub_limit_final}
            ),
            article_sg_mapped as (
            	select
            		article,
            		default_store_groups,
            		string_agg(distinct name, ',') as sg_name
            		from
            		(
            		select
            			article,
            			ph_code,
            			channel,
            			default_store_groups,
            			unnest(default_store_groups) as sg_code
            		from inventory_smart.ph_configuration_mapping pcm
            		join inventory_smart.ph_master using(ph_code, channel)
            		where channel = {channel} and article in (select article from paf)
            		) s
            		join "global".store_groups sg using(sg_code)
            		where is_deleted = false
            		group by 1,2
            ),
            sku_dc_reserved_units as materialized (
            	select 
            	product_code,
            	dc_code,
            	coalesce(sum(quantity), 0) as reserved_quantity
            	from inventory_smart.sku_dc_reserved_units((select array_agg(product_code) from paf), '{}')
				where channel = {channel} 
				group by 1,2
            ),
			sku_dc_allocated_units as (
				select 
					article, 
					size,
					dc_code,
					coalesce(sum(quantity), 0) as allocated_quantity
					from inventory_smart.sku_dc_allocated_units sdau
					where channel = {channel}
					group by 1,2,3
			),
            final_result_without_instock as (
            	select fri.*,
            		default_store_groups,
            		sg_name,
            		coalesce(reserved_quantity, 0) as reserved_quantity,
            		coalesce(allocated_quantity, 0) as allocated_quantity,
				 	{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit
           		from final_result_initial fri
           		left join article_sg_mapped asm using(article)
           		left join sku_dc_reserved_units using(dc_code, product_code)
           		left join sku_dc_allocated_units using(article, size, dc_code)
           	)
			,final_result as (
				SELECT fr.*,
					ssd.country,
					ssd.instock_pct as dc_instock_pct,
					ssd.instock_pct_details as dc_instock_pct_details
				FROM final_result_without_instock  fr
				left join ssd_fdata ssd using(dc_code,product_code)
				order by sub_offset
			)
			,final_cte as (
			SELECT
				fp.article,
			    fp.product_code,
			    fp.channel,
			    fp.dc_code,
			    fp.dc_name,
			    fp.dc_oh,
			    fp.oh,
			    fp.l1_name,
			    fp.l2_name,
			    fp.l3_name,
			    fp.l4_name,
			    fp.l1_id,
			    fp.l2_id,
			    fp.l3_id,
			    fp.l4_id,
			    fp.source,
			    fp.size_name,
			    fp.brand,
			    fp.style_color_id,
			    fp.product_description,
			    fp.model_description,
			    fp.style,
			    fp.supersede_flag,
			    fp.key,
			    fp.default_store_groups,
			    fp.sg_name,
			    fp.reserved_quantity,
			    fp.allocated_quantity,
			    fp.country,
			    fp.dc_instock_pct,
			    fp.dc_instock_pct_details,
				''''||fp.size||'''' as size,
				"limit",
				sub_offset,
			   "offset",
				sub_limit
		FROM final_result fp)

		select {select} from final_cte
         	
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
	END;
$function$
;