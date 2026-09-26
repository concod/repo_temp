--liquibase formatted sql
--changeset liquibase:constraints_store_group_aggregate runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for constraints_store_group_aggregate
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_group_aggregate(input refcursor, jsonb, jsonb, integer, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_group_aggregate(input refcursor, jsonb, jsonb, integer, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 calling_statement :
		BEGIN;
select * from inventory_smart.constraints_store_grade_list('my_cur'::refcursor, '{
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
'{}'::jsonb);
FETCH ALL IN "my_cur";
select rows_count from cache.rows_count(current_setting('myvars.cache_table_id'), '{
	"sort": [],
	"limit": {
		"limit": 100,
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
		_query_table_filters text := '';
		_application_code int := $4;
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'application_code', $4, 'article', $5, 'product_code', $6);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.constraints_store_group_aggregate';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.constraint_master_factory_line_retail,inventory_smart.constraint_master_full_line_retail}';
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
		raise notice '%', _query_pa;
		raise notice '%', _query_sa;
		_query_combine := '
			WITH product_master_filters_data AS (
			    SELECT 
					saf.store_code,
					pmps.mapping_code,
					saf.channel,
					paf.l0_name,
					paf.article
				FROM (select l0_name, article, unnest(product_code_size_map) as product FROM inventory_smart.ph_master ' || _query_pa || '  and channel = ''' ||replace (_channel,',','')||''') paf
				join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name 
			    join (select store_code, channel FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    using(store_code)
				where paf.article = ''' || $5 || '''
			)
--			select * from product_master_filters_data
			,
			final_result AS (
				    SELECT 
						sg.name as store_group_name,
						c.product_code,
						array_agg(to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'')) updated_at,
						array_agg(email) updated_by,
						array_agg(c.store_code) as store_codes,
						ROUND(avg(wos)::numeric, 2) as wos,
					    avg(transit_time) as transit_time_sum,
					    ROUND(avg(min_stock)::numeric, 2) as min_store,
					    ROUND(avg(max_stock)::numeric, 2) as max_store,
					    sum(min_stock) as min_store_sum,
					    sum(max_stock) as max_store_sum
				    FROM inventory_smart.constraint_master c
				    join product_master_filters_data pmps
				    using(mapping_code, l0_name)
					left JOIN global.store_groups sg on sg.channel = pmps.channel
					join global.store_groups_mapping sgm 
						on sg.sg_code =sgm.sg_code  
						and sgm.store_code = pmps.store_code 
				    LEFT JOIN global.user_master um on c.updated_by = um.user_code
				    where sg.is_deleted = false
				    and sg.application_code = ' || _application_code || '
				    and sg.channel = ''' || _channel || '''
					and c.product_code = ''' || $6 || ''' and c.mapping_code is not null
					and c.l0_name in (select distinct l0_name from product_master_filters_data)
					group by 1,2
				)
				select * from final_result';
		raise notice '%',_query_combine;
		select * from cache.wrap_sp(
				_cache_schema,
				_cache_sp,
				_cache_payload,
				_query_combine,
				_cache_dependencies,
				_cache_key_pattern) into _cache_table_id;
		perform set_config('myvars.cache_table_id', _cache_table_id, true);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ';
		RETURN $1;
	end
$function$
;
