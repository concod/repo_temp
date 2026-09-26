--liquibase formatted sql
--changeset shubham.singh:constraints_store_list-2 runOnChange:true stripComments:false splitStatements:false context:MTP-48841 labels:MTP-48841 
--comment: MTP-48841 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_list_tpc(input refcursor, jsonb, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_list_tpc(input refcursor, jsonb, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 		
 Calling statement:		
 				BEGIN;
select * from inventory_smart.constraints_store_list('my_cur'::refcursor, '{
    "l0_name": [{"type":"list","operator":"in","values":["Accessories"]}],
    "l1_name": [],
    "l2_name": [],
    "l3_name": [],
    "l4_name": [],
    "style": [],
    "style_description": [],
    "article": [],
    "color": [],
    "color_code": [],
    "human_readable_color": [],
    "launch_date": [],
    "assortment_indicator": [],
    "factory_type": [],
    "article_status_tag": []
}'::jsonb,
'{"channel":[{"type":"list", "operator": "in", "values":["Factory Line Retail"]}]}'::jsonb,
'{
		"search": [{
                "column": "article",inventory_smart.constraints_store_list
                "pattern": "10ACBG1002-NEIN"
            },
            {
                "column": "store_name",
                "pattern": "Chicago Premium Outlets"
            }],
		"sort": [],
		"range": [],
		"limit": {
			"page": 1,
			"limit": 10
		}
	}'::jsonb);
FETCH ALL IN "my_cur";
select rows_count from cache.rows_count(current_setting('myvars.cache_table_id'), '{
    "sort": [],
    "limit": {
        "limit": 10,
        "page": 1
    }
}');
COMMIT;
 Modified by :kailash Yadav  18-Aug-2022
	 Jira Ticket :https://impactanalytics.atlassian.net/browse/DAT-115
 */
	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_fw text := '';
		_channel text[] := inventory_smart.get_channel_from_input_new($3);
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		_channel_where_condition text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_client_columns text;
		
		_query_combine_format text := '';
		_query_combine_count_format text := '';
		_query_combine_count text := '';
        _count int := 1;
		_batch_count int := 0;
		_ph_sort text ;
		_ph_search text;
        _overall_search text;
        _limit int;
        _offset int;
		_sub_limit int;
		_sub_offset int;
		_test1 int;
        _initial_limit int;
        _dummy text;
        _sa_search text := '';
        _formatter jsonb;
       l0_name_updated text := '';
	begin 		
		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		SELECT * FROM inventory_smart.form_search_sort_clause($5, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;
		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);

		-- converting min and max to min_stock and max_sock
        IF ($4 -> 'min') IS NOT NULL THEN
            $4 := $4 - 'min' || jsonb_build_object('min_stock', $4 -> 'min');
        END IF;
        IF ($4 -> 'max') IS NOT NULL THEN
            $4 := $4 - 'max' || jsonb_build_object('max_stock', $4 -> 'max');
        END IF;

		_query_fw := global.form_main_table_filters_v2('constraint_master_weekly', $4);
	
		_query_table_filters := global.form_table_query($5);
		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
		_query_combine_count_format := $$
		  SELECT COUNT(*)
			FROM
			(
             select
			    *
			  from 
			    inventory_smart.ph_master
				{pa_filter} {pa_search}
				{limit_final}
			) sq
		$$;
        _query_combine_format := $$
        	with paf as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				{pa_filter} {pa_search}
				{limit_final}
			),
			saf as (
				select * FROM global.store_attributes_filter saf 
			 	{sa_filter} {sa_search}
			),
			product_master_filters_data as materialized (
					  SELECT 
					    pmps.product_code, 
 					    pmps.mapping_code, 
 					    pmps.store_code,
 						paf.article_status_tag,
 					    paf.l0_name, 
 					    paf.l1_name,
						paf.l2_name,
						paf.product_channel_name,
 					    paf.article,
						paf.store_pack_size,
                        paf.product_description,
						paf.planning_ownership,
						paf.merchandise_category,
						paf.merchandise_brand,
						paf.metal_color,
						paf.metal_type,
						paf.sku_grade,
						paf.drop_ship_ind,
 					    saf.store_name, 
						saf.district,
						saf.dma_name,
						saf.shop_in_shop,
						saf.combo_store,
 					    saf.channel
					  FROM paf 
					  join (select * from global.product_mapping_product_store where l0_name = {l0_name_updated}) pmps on paf.article = pmps.product_code and paf.l0_name = pmps.l0_name		
					  join saf using(store_code)
				) -- select * from product_master_filters_data
				, 
				weekly_constraints as(
					select pmfd.*,
							fiscal_year_week,
						      jsonb_build_object(
						      'wos', c.wos::text,
	                          'min', c.min_stock::text,
	                          'max', c.max_stock::text,
							  'updated_by', email, 
	 						  'updated_at', to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE 'EST', 'YYYY-MM-DD HH24:MI:SS')
							) as stores
						from inventory_smart.constraint_master_weekly c
						join product_master_filters_data pmfd using(product_code, store_code)
						LEFT JOIN global.user_master um on c.updated_by = um.user_code
					   {fw_filter}
						and c.l0_name = {l0_name_updated} 
						and c.mapping_code is not null
				),
				constraint_data_1 AS (
					  SELECT 
						wc.product_code,
						wc.mapping_code, 
 					    wc.store_code,
						wc.district,
						wc.product_channel_name,
 					    wc.l0_name, 
 					    wc.l1_name, 
						wc.l2_name,
 						wc.article, 
                        wc.product_description,
 						wc.article_status_tag,
 					    wc.store_name, 
 					    wc.channel,
						wc.planning_ownership,
						wc.dma_name as dma,
						wc.combo_store as combo_store_flag,
						wc.shop_in_shop,
						wc.store_pack_size,
						metal_color,
						metal_type,
						merchandise_brand,
						merchandise_category,
						sku_grade,
						drop_ship_ind,
 						asg.grade as store_grade,
 						case 
 							when asg.grade = 'AAA' then 1
                            when asg.grade = 'AA' then 2
 							when asg.grade = 'A' then 3
 							when asg.grade = 'B' then 4
 							when asg.grade = 'C' then 5
 							when asg.grade = 'D' then 6
 							else 11
 						end as store_grade_priority,
						jsonb_object_agg(CONCAT('Week-', wc.fiscal_year_week), wc.stores) as stores
						from weekly_constraints wc
 						left join inventory_smart.article_store_grade asg on wc.store_code = asg.store_code and wc.article = asg.article	
						-- '|| _overall_search ||'
 						group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25
						ORDER BY article ASC, product_code ASC, store_code asc
				),
				constraint_data as (
					SELECT * FROM constraint_data_1
					WHERE TRUE {overall_search} {ph_sort}
					{sub_limit_final}			
				),
				final_result as (
          		select *,
        			{limit} "limit",
					{offset} "offset",
					{sub_limit} sub_limit,
					{sub_offset} + ROW_NUMBER () OVER () as sub_offset
					from constraint_data
				)
				select * from final_result
				
			$$;
       
		   _formatter = json_build_object(
            'pa_filter', _query_pa,
            'sa_filter', _query_sa,
            'fw_filter', _query_fw,
            'pa_search', _ph_search,
            'sa_search', _sa_search,
            'limit', _limit,
            'sub_limit', _sub_limit,
            'offset', _offset,
            'sub_offset', _sub_offset,
            'ph_sort', _ph_sort,
            'overall_search', _overall_search,
            'l0_name_updated', l0_name_updated
        );
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);   
	end
$function$
;