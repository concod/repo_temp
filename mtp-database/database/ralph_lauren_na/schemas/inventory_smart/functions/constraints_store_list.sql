--liquibase formatted sql
--changeset surya.kuruvadi@impactanalytics.co:constraints_store_list-4 runOnChange:true stripComments:false splitStatements:false context:MTP-113480 labels:MTP-113480
--comment: formatted timezone MTP-113480
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_list(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_list(input refcursor, jsonb, jsonb, jsonb)
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
		_channel text := inventory_smart.get_channel_from_input($3);
		_l0_name text[] := inventory_smart.get_l0_name_from_input($2);
		_channel_where_condition text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_client_columns text;
		_temp_str text;
     	_val text;
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
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'ph_master', 'inventory_smart') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset, _sub_limit, _sub_offset;
		SELECT * FROM inventory_smart.form_search_sort_clause($4, 'store_attributes_filter', 'global') INTO _dummy, _sa_search, _dummy, _dummy, _dummy, _dummy, _dummy;

		raise notice ' rrrrr % % % %', _limit, _offset, _sub_limit, _sub_offset;
		_query_pa := inventory_smart.form_main_table_filters('ph_master', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
	
		_query_table_filters := global.form_table_query($4);
		select 'any('''|| concat(_l0_name) ||'''::varchar[])' into l0_name_updated;
		_query_combine_count_format := $$
		  SELECT COUNT(*)
			FROM
			(
             select
			    *
			  from 
			    inventory_smart.ph_master
				{pa_filter} {pa_search} and channel = {channel}
				{limit_final}
			) sq
		$$;
		if $2->'sizes' IS NOT NULL THEN
	        select value into _temp_str from json_each_text($2::json) where key='sizes';
	       	select concat(jsonb_agg(value)) into _val from json_array_elements_text(((json_extract_path(_temp_str::json, '0')::json)->>'values')::json);
	      	_temp_str =  replace(replace(replace(_val,'"',''''),'[',''),']','');
			RAISE NOTICE 'size %',_temp_str;
			_temp_str = 'where product->>''size'' in (' || _temp_str || ')';
			RAISE NOTICE ' _temp_str %',_temp_str;   	
	    ELSE
	       	_temp_str = ''; 
	    END IF; 	
        _query_combine_format := $$
        	with paf as (
			  select 
			    *
			  from 
			    inventory_smart.ph_master
				{pa_filter} {pa_search} and channel = {channel}
				{limit_final}
			),
			saf as (
				select * FROM global.store_attributes_filter saf 
			 	{sa_filter} {sa_search}
			),
			product_master_filters_data AS (
					  SELECT
					    pmps.product_code, 
 					    pmps.mapping_code, 
 					    pmps.store_code,
 						paf.article_status_tag,
 						paf.ph_code,
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
 						product->>'size' as size,
						product->>'order' as size_order,
 					    paf.article,
						paf.style,
						paf.color,
 					    saf.store_name, 
 					    saf.channel,
						saf.retail_facility_code
					  FROM (
					      SELECT *, UNNEST(product_code_size_map) as product
					      FROM paf
					  ) paf  
					  join (select * from global.product_mapping_product_store where l0_name = {l0_name_updated}) pmps on paf.product->>'product_code' = pmps.product_code and paf.l0_name = pmps.l0_name		
					  join saf using(store_code)
					  {where_filter}
				) -- select * from product_master_filters_data
				, 
				constraint_data_1 AS (
					  SELECT 
						pmps.ph_code,
					  	pmps.product_code, 
 					    pmps.store_code,
						pmps.mapping_code,
 						concat('''', pmps.size) as size,
						pmps.size_order,
 					    pmps.l0_name, 
 					    pmps.l1_name, 
						pmps.l2_name,
 					    pmps.l3_name,
						pmps.l4_name,
 						pmps.article, 
 						pmps.article_status_tag,
 						pmps.style,
                        pmps.color,
 					    pmps.store_name, 
 					    pmps.channel,
						pmps.product_description,
						pmps.model_description, 
						pmps.style_color_id,
						pmps.brand,
						pmps.supersede_flag,
						pmps.retail_facility_code,
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
						c.upload_flag as upload_flag,
 					    c.wos, 
 					    min_store, 
	                    max_store, 
	                    min_store_sum, 
	                    max_store_sum, 
	                    transit_time_sum, 
	                    um.name AS updated_by, 
 						to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE 'US/eastern', 'MM-DD-YYYY HH24:MI:SS') as updated_at
					  FROM 
                   		(select *, 
						c.min_stock as min_store, 
                        c.max_stock as max_store, 
                        c.min_stock as min_store_sum, 
                        c.max_stock as max_store_sum, 
                        c.transit_time as transit_time_sum  from inventory_smart.constraint_master c ) c 
 					    join product_master_filters_data pmps using(mapping_code, l0_name)
 					    LEFT JOIN global.user_master um on c.updated_by = um.user_code
 						left join inventory_smart.article_store_grade asg on pmps.store_code = asg.store_code and pmps.article = asg.article and pmps.ph_code = asg.ph_code
						where c.l0_name = {l0_name_updated} AND c.channel = {channel}
						and c.mapping_code is not null
						ORDER BY article ASC, size_order ASC, store_code asc
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
				select {select} from final_result
				
			$$;
       
		   _formatter = json_build_object(
            'pa_filter', _query_pa,
            'sa_filter', _query_sa,
            'pa_search', _ph_search,
            'sa_search', _sa_search,
			'where_filter', _temp_str,
            'limit', _limit,
            'sub_limit', _sub_limit,
            'offset', _offset,
            'sub_offset', _sub_offset,
            'ph_sort', _ph_sort,
            'overall_search', _overall_search,
            'l0_name_updated', l0_name_updated,
			'channel', _channel
        );
       RETURN inventory_smart.fetch_with_pagination($1, _query_combine_format, _query_combine_count_format, _formatter);   
	end
$function$
;