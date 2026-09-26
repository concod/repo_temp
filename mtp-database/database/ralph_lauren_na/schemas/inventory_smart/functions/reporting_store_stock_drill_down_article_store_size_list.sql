--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_article_store_size_list runOnChange:true stripComments:false splitStatements:false context:Release_1_3_1 labels:MTP-83719
--comment: MTP-83719
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
       	json_key text := '';
        json_value text := '';
       	filter_key text := '';
       	filter_value text := '';
        _query_filter text := '';
        _channel text;
	
	BEGIN
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
	raise notice 'sub limit top %', _sub_limit;
        _initial_limit := _limit;
        SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
 		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
        _query_sa = global.form_main_table_filters('store_attributes_filter', $3);
        _channel := inventory_smart.get_channel_from_input($3);
       
       	FOR json_key, json_value IN SELECT * FROM jsonb_each($4) LOOP
	       	IF json_key = 'custom_filters' then
	       		FOR filter_key, filter_value in SELECT * FROM jsonb_each_text(json_value::jsonb) loop
		       		_query_filter = 'and (coalesce(store_avail_oh, 0) < 0) in '|| filter_value;
	       			RAISE NOTICE 'neg inv filter_key: %, filter_value: %', filter_key, filter_value;
	       		end LOOP;
	       		EXIT;
        	end if;
    	END LOOP;
       
 		_query_combine_count_format := $$
            SELECT COUNT(*)
			FROM
			(
                SELECT article, color, l0_name, l1_name, l2_name, model_description, l3_name, l4_name, product_description, style_color_id, size, product_code, supersede_flag, brand, upc
                FROM global.product_attributes_filter
                {pa_filter} {pa_search} and active
                {limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH paf as materialized (
                SELECT article, color, l0_name, l1_name, l2_name, model_description, l3_name, l4_name, product_description, style_color_id, size, product_code, supersede_flag, brand, upc
                FROM global.product_attributes_filter
                {pa_filter} {pa_search} and active
                order by product_code
                {limit_final}
            ),
            paf_ssd as materialized (
            	select paf.*,
            		store_code,
            		channel,
					store_status,
					style_color_status,
					instock_pct,
					instock_pct_details,
					wos_predicted ,
					store_avail_oh ,
					store_in_transit,
					oo,
					tot_inv,
					size_integrity,
					lw_qty,
					oh_dc,
					financial_zone,
					min_constraints,
					max_constraints,
					week_to_date_sales,
					sales_1_ago,
					sales_2_ago,
					sales_3_ago,
					sales_4_ago,
					estimated_demand,
					capped_demand,
					floorset_date,
					twos
            	from paf paf
            	join inventory_smart.store_stock_drilldown ssd
            	on md5(ssd.article || '-' || ssd.product_code) = md5(paf.article || '-' || paf.product_code)
              	where channel = {channel}
            ),
            saf as materialized(
                SELECT store_code, channel, retail_facility_code, store_name, climate,region, special_classification, country
                FROM global.store_attributes_filter
                {sa_filter} {sa_search}
            ),
			sales_data as(
				select
					product_code,
					store_code,
					round((sum(coalesce(sales_1_ago, 0)) + sum(coalesce(sales_2_ago, 0)) + sum(coalesce(sales_3_ago, 0)))::numeric, 2) as three_week_ago_sales_units,
				    round((sum(coalesce(sales_1_ago, 0)) + sum(coalesce(sales_2_ago, 0)) + sum(coalesce(sales_3_ago, 0)) + sum(coalesce(sales_4_ago, 0)))::numeric, 2) as four_week_ago_sales_units
				from paf_ssd
				join saf using(store_code)
				group by 1, 2
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
				paf.brand,
				paf.supersede_flag,
				store_status,
				model_description,
				case when style_color_status is not null then style_color_status
				else '-'
				end as style_color_status,
				paf.product_description,
				paf.style_color_id,
				sd.store_code,
				channel,
				retail_facility_code,
				store_name,
				climate,
				region,
				country,
				''''||size as size,
				product_code,
				financial_zone,
				upc,
				round(coalesce(sales_1_ago, 0)::numeric, 2) as one_week_ago_sales_units,
				three_week_ago_sales_units,
				four_week_ago_sales_units,
				round(coalesce(week_to_date_sales, 0)::numeric, 2) as week_to_date_sales_units,
				round(coalesce(twos, 0)::numeric, 2) as twos,
				round(coalesce(min_constraints, 0)::numeric, 2) as min_constraints,
				round(coalesce(max_constraints, 0)::numeric, 2) as max_constraints,
				round(coalesce(capped_demand, 0)::numeric, 2) as capped_demand,
				round(coalesce(estimated_demand, 0)::numeric, 2) as estimated_demand,
				case
					when (oo + store_avail_oh + store_in_transit) = 0 then 0
					else round((coalesce(min_constraints, 0) / nullif(coalesce(store_avail_oh, 0) + coalesce(store_in_transit, 0) + coalesce(oo, 0), 0))::numeric, 2)
				end as min_supply_ratio,
				case
					when coalesce(store_avail_oh, 0) = 0 then 0
					else round((coalesce(min_constraints, 0)/store_avail_oh)::numeric, 2)
				end as min_stock_ratio,
				round(coalesce(instock_pct_details, 0)::numeric, 2) as instock_pct_details,
				ROUND(coalesce(wos_predicted, 0)::numeric, 2) as wos_predicted,
				coalesce(tot_inv,0) as tot_inv,
				coalesce(store_avail_oh, 0) as oh,
				coalesce(store_in_transit, 0) as it,
				coalesce(oo,0) as oo,
				ROUND(coalesce(size_integrity::numeric, 0)*100, 2) as size_integrity,
				coalesce(lw_qty,0) as lw_qty,
				case WHEN coalesce(store_avail_oh, 0) < 0 THEN True ELSE False end as negative_inventory_oh
			from paf_ssd paf
			join sales_data sd using(product_code, store_code)
			join saf using (store_code, channel)
			where special_classification != 'WHS'
			{negative_inventory_filter}
			{sub_limit_final}
          ),
          raw_ssd as (
              select article, product_code, channel, dc."name" dc_name, coalesce(sum(raw_ssd.oh_dc), 0) as dc_oh from paf_ssd raw_ssd
              join global.distribution_centres dc on raw_ssd.store_code = dc.linked_store_code
              group by 1,2,3,4
          ),
          dc_data as (
     		select
     			article,
     			ssd.store_code,
     			ssd.product_code,
     			dc_name,
     			coalesce(sum(rssd.dc_oh), 0) as dc_oh
     		from ssd_data ssd
     		left join raw_ssd rssd using(article, product_code, channel)
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
          	select sd.*,
          			coalesce(bulk_remaining, 0) as bulk_remaining,
          			dc_oh_mapped,
          			concat(article, '-', store_code, '-', size) as key,
          			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
			from ssd_data sd
          	left join dc_data_aggregated using(article, store_code, product_code)
          	order by sub_offset
          	)
 			SELECT {select} FROM final_result;
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
            'negative_inventory_filter', _query_filter,
            'channel', _channel
        );
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;