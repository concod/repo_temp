--liquibase formatted sql
--changeset liquibase:constraints_store_grade_aggregate runOnChange:true stripComments:false splitStatements:false context:Release_1_0_2 labels:liquibase_project_start
--comment: initial changeset for constraints_store_grade_aggregate
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_grade_aggregate(input refcursor, jsonb, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_grade_aggregate(input refcursor, jsonb, jsonb, text, text)
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
		_channel text := inventory_smart.get_channel_from_input($3);
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'article', $4, 'product_code', $5);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.constraints_store_grade_aggregate';
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
					pmps.product_code,
					pmps.mapping_code,
					saf.store_code,
					asg.grade as store_grade,
					saf.channel,
					paf.l0_name,
					paf.article
				FROM (select *, unnest(product_code_size_map) as product FROM inventory_smart.ph_master ' || _query_pa || ') paf
				join global.product_mapping_product_store pmps on paf.product->>''product_code'' = pmps.product_code and paf.l0_name = pmps.l0_name
			    join inventory_smart.article_store_grade asg using (store_code, article)	
			    join (select store_code, channel FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    using(store_code)
				where paf.article = ''' || $4 || '''
			)
--			select * from product_master_filters_data
			,
			final_result AS (
			    SELECT 
				    pmps.store_grade,
					c.product_code,
					case 
  							when pmps.store_grade = ''AAA'' then 1
  							when pmps.store_grade = ''AA'' then 2
  							when pmps.store_grade = ''A'' then 3
  							when pmps.store_grade = ''B'' then 4
  							when pmps.store_grade = ''C'' then 5
  							when pmps.store_grade = ''D'' then 6
  							else 11
  						end as store_grade_priority,
					array_agg(to_char(coalesce(c.updated_at, c.created_at) AT TIME ZONE ''EST'', ''YYYY-MM-DD HH24:MI:SS'')) updated_at,
					array_agg(email) updated_by,
					array_agg(c.store_code) as store_codes,
					ROUND(avg(wos)::numeric, 2) as wos,
				    avg(transit_time) as transit_time_sum,
				    ROUND(avg(min_stock)::numeric, 2) as min_store,
				    ROUND(avg(max_stock)::numeric, 2) as max_store,
				    sum(min_stock) as min_store_sum,
				    sum(max_stock) as max_store_sum
			    FROM 
				inventory_smart.constraint_master c
			    join product_master_filters_data pmps using(mapping_code, l0_name)
				LEFT JOIN global.user_master um on c.updated_by = um.user_code
				where c.product_code = ''' || $5 || ''' and c.l0_name in (select distinct l0_name from product_master_filters_data)
				and c.mapping_code is not null
			    group by 1,2,3 order by store_grade_priority
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
