--liquibase formatted sql
--changeset liquibase:reporting_store_stock_drill_down_article_store_list runOnChange:true stripComments:false splitStatements:false context:Release_1_2_2 labels:MTP-70408
--comment: MTP-70408
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_store_stock_drill_down_article_store_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_store_stock_drill_down_article_store_list(input refcursor, jsonb, jsonb, jsonb)
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
                SELECT article, product_description, model_description, color, style_color_id, l0_name, l1_name, l2_name, l3_name, l4_name, brand, supersede_flag
                FROM inventory_smart.ph_master {pa_filter} {pa_search} and channel = {channel}
                group by 1,2,3,4,5,6,7,8,9,10,11,12
                {limit_final}
			) sq
        $$;
        _query_combine_format := $$
            WITH paf as (
                SELECT article, product_description, model_description, color, style_color_id, l0_name, l1_name, l2_name,l3_name, l4_name, brand, supersede_flag
                FROM inventory_smart.ph_master {pa_filter} {pa_search} and channel = {channel}
                group by 1,2,3,4,5,6,7,8,9,10,11,12
                order by article
                {limit_final}
            ),
            ssd_paf as (
             	select  paf.*,        
             			ssd.store_code, ssd.channel, ssd.store_status, ssd.style_color_status, ssd.instock_pct, instock_pct_details,
             			store_avail_oh, oo, store_in_transit, store_level_prediction, tot_inv, size_integrity, lw_qty, oh_dc, oh_packs_in_eaches,
             			oh_packs, financial_zone, min_constraints, max_constraints, week_to_date_sales, sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago, 
             			estimated_demand, capped_demand, floorset_date, twos
             	from paf paf
            	join (select store_code, channel, article, store_status, style_color_status, instock_pct, instock_pct_details, store_avail_oh,
            	oo, store_in_transit, store_level_prediction, tot_inv, size_integrity,lw_qty, oh_dc, oh_packs_in_eaches, oh_packs, 
            	financial_zone, min_constraints, max_constraints, week_to_date_sales, sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago, estimated_demand,
            	capped_demand, floorset_date, twos
            	from inventory_smart.store_stock_drilldown where channel = {channel}) ssd using(article)
         	), 
            saf as MATERIALIZED(
                SELECT special_classification, store_code, channel, retail_facility_code, store_name, climate, region, currency_cd, country
                FROM global.store_attributes_filter
                {sa_filter} {sa_search}
            ),
           ssd_paf_saf as MATERIALIZED(
              select
                  article,
                  store_code,
                  store_status,
                  case when style_color_status is not null then style_color_status
			      else '-'
			      end as style_color_status,
			      ssd.channel,
			      string_agg(distinct financial_zone, ', ') as financial_zone,
			      round(sum(coalesce(sales_1_ago, 0))::numeric, 2) as one_week_ago_sales_units,
				  round((sum(coalesce(sales_1_ago, 0)) + sum(coalesce(sales_2_ago, 0)) + sum(coalesce(sales_3_ago, 0)))::numeric, 2) as three_week_ago_sales_units,
				  round((sum(coalesce(sales_1_ago, 0)) + sum(coalesce(sales_2_ago, 0)) + sum(coalesce(sales_3_ago, 0)) + sum(coalesce(sales_4_ago, 0)))::numeric, 2) as four_week_ago_sales_units,
			      round(sum(coalesce(week_to_date_sales, 0))::numeric, 2) as week_to_date_sales_units,
			      round(avg(coalesce(twos, 0))::numeric, 2) as twos,
			      min(floorset_date) as floorset_date,
			      round(sum(coalesce(min_constraints, 0))::numeric, 2) as min_constraints,
			      round(sum(coalesce(max_constraints, 0))::numeric, 2) as max_constraints,
			      round(sum(coalesce(capped_demand, 0))::numeric, 2) as capped_demand,
			      round(sum(coalesce(estimated_demand, 0))::numeric, 2) as estimated_demand,
			      case
    		          when sum(oo+store_avail_oh+store_in_transit) = 0 then 0
    			      else round((sum(coalesce(min_constraints, 0)) / nullif(sum(oo+store_avail_oh+store_in_transit), 0))::numeric, 2)
			      end as min_supply_ratio,
			      case 
			          when sum(store_avail_oh) = 0 then 0
				  else round((sum(coalesce(min_constraints, 0))/sum(store_avail_oh))::numeric, 2)
			      end as min_stock_ratio,
			      sum(coalesce(tot_inv,0)) as tot_inv,
			      ROUND(coalesce(SUM((case when special_classification = 'Outlet' then store_avail_oh + oo + store_in_transit else 0 end)) / SUM(case when special_classification = 'Outlet' then store_level_prediction end ), 0):: numeric, 1):: text wos_predicted,
			      sum(coalesce(store_avail_oh, 0)) as oh,
			      sum(coalesce(store_in_transit, 0)) as it,
			      sum(coalesce(oo,0)) as oo,
			      ROUND(coalesce(AVG(case when special_classification = 'Outlet' then size_integrity else null end), 0):: numeric, 2):: text size_integrity,
			      sum(coalesce(lw_qty,0)) as lw_qty
			  from ssd_paf ssd
			  join saf using (store_code, channel)
			  where special_classification != 'WHS'
			  group by 1, 2, 3, 4, 5
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
				   paf.product_description,
				   paf.model_description,
				   paf.style_color_id,
				   paf.brand,
				   paf.supersede_flag,
				   store_code,
				   ssd.channel,
				   store_status,
			       retail_facility_code,
			       store_name,
			       climate,
			       region,
			       currency_cd,
			       country,
			       style_color_status,
				   ssd.financial_zone,
				   ssd.one_week_ago_sales_units,
				   ssd.three_week_ago_sales_units,
				   ssd.four_week_ago_sales_units,
				   ssd.week_to_date_sales_units,
				   ssd.twos,
				   ssd.floorset_date,
				   ssd.min_constraints,
				   ssd.max_constraints,
				   ssd.capped_demand,
				   ssd.estimated_demand,
				   ssd.min_supply_ratio,
				   ssd.min_stock_ratio,
				   ssd.tot_inv,
				   ssd.wos_predicted,
				   ssd.oh,
				   ssd.it,
				   ssd.oo,
				   ssd.size_integrity,
				   ssd.lw_qty
				from ssd_paf_saf ssd
				join paf using(article)
				join saf using(store_code)
				where special_classification != 'WHS'
				order by article
				{sub_limit_final}
          ),
          dc_data as (
          	select 
          		article,
          		ssd.store_code,
          		dc."name" dc_name,
          		coalesce(sum(ssd2.oh_dc), 0) as dc_oh,
				sum(coalesce(oh_packs_in_eaches, 0)) as oh_packs_in_eaches,
				sum(coalesce(oh_packs, 0)) as oh_packs
          		from ssd_paf_saf ssd
          		left join ssd_paf ssd2 using(article, channel)
           		join global.distribution_centres dc on ssd2.store_code = dc.linked_store_code::text
          		group by 1,2,3
          	),
           dc_data_aggregated as (
          	select 
          		article,
          		store_code,
          		json_object_agg(concat('dc_eaches_', dc_name), dc_oh) AS dc_oh_mapped_eaches,
				json_object_agg(concat('dc_packs_', dc_name), oh_packs) AS dc_oh_packs_mapped,
				json_object_agg(concat('dc_', dc_name), COALESCE(dc_oh, 0) + COALESCE(oh_packs_in_eaches, 0)) AS dc_oh_mapped,
          		sum(coalesce(dc_oh,0)) as bulk_remaining,
				sum(coalesce(oh_packs, 0)) as bulk_remaining_packs,
				sum(coalesce(dc_oh,0))  + sum(coalesce(oh_packs_in_eaches, 0)) as bulk_remaining_total
          		from dc_data
          		group by 1,2
          		),
          	final_result as (
          		select sd.*,
          			dc_oh_mapped,
          			dc_oh_packs_mapped,
					dc_oh_mapped_eaches,
          			coalesce(bulk_remaining, 0) as bulk_remaining,
					coalesce(bulk_remaining_packs, 0) as bulk_remaining_packs,
					coalesce(bulk_remaining_total, 0) as bulk_remaining_total,
          			concat(article, '-', store_code) as key,
          			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
			from ssd_data sd
          	left join dc_data_aggregated using(article, store_code)
          	order by article, store_code
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
            'channel', _channel
        );
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);
    end
$function$
;