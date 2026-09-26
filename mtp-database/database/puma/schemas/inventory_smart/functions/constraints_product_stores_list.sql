--liquibase formatted sql
--changeset liquibase:constraints_product_stores_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for constraints_product_stores_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_product_stores_list(input refcursor, character varying, character varying[], jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_product_stores_list(input refcursor, character varying, character varying[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
 calling_statement :
		 	BEGIN;
		select * from inventory_smart.constraints_product_stores_list(
			'my_cur'::refcursor,
			'10ACBP1001-NGLONS',
			'{"4005", "4008", "4002", "4010", "4007", "4006", "4004", "4009", "4051", "4003", "4001"}'::varchar[],
			'{}'::jsonb
		);
		FETCH ALL IN "my_cur";
		select rows_count from cache.rows_count(current_setting('myvars.cache_table_id'), '{
		    "sort": [],
		    "limit": {
		        "limit": 100,
		        "page": 1
		    }
		}');
		COMMIT;
		 Modified by : kailash Yadav  18-Aug-2022
	 Jira Ticket : https://impactanalytics.atlassian.net/browse/DAT-115

 */
	declare
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_code', $2, 'stores', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.constraints_product_stores_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.constraint_master_factory_line_retail,inventory_smart.constraint_master_full_line_retail}';
	begin
		_query_combine := '
			WITH product_master_filters_data AS (
			    SELECT 
					pmps.product_code,
					pmps.mapping_code,
					saf.store_name,
					saf.store_id,
					asg.grade,
					pmps.store_code
				FROM 
			    global.product_mapping_product_store pmps
				join global.store_attributes_filter saf using(store_code)
				join global.product_attributes_filter paf using(product_code)
				left join inventory_smart.article_store_grade asg on asg.store_code = saf.store_code and paf.article  = asg.article
			    where product_code = ''' || $2 || '''
			    and saf.store_code = any(''' || concat($3) || '''::varchar[])
			)
			-- select * from product_master_filters_data
			,
			constraint_data AS (
			    SELECT 
				   c.product_code,
				   c.store_code,
				   pmps.store_name,
				   pmps.store_id,
				   pmps.grade as store_grade,
			       c.aps,
			       c.ros,
			       c.wos,
			       c.min_stock,
			       c.max_stock,
			       c.transit_time,
			        email AS updated_by,
			        c.updated_at
			    FROM inventory_smart.constraint_master c
			    join product_master_filters_data pmps
			    using(mapping_code)
			     LEFT JOIN global.user_master um on c.updated_by = um.user_code
			)
			-- select * from constraint_data
			, spc AS (
				select
					product_code,
					store_code,
					store_id,
					 updated_at,
					 updated_by,
					store_name,
					store_grade,
					avg(wos) as wos,
				    avg(transit_time) as transit_time_sum,
				    avg(min_stock) as min_store,
				    avg(max_stock) as max_store,
				    sum(min_stock) as min_store_sum,
				    sum(max_stock) as max_store_sum
				FROM constraint_data
			    group by 1,2,3,4,5,6,7
			)
						select * from spc order by store_code';
		raise notice '%', _query_combine;
--		INSERT INTO inventory_smart.raise_notice(q, t) values (_query_combine, now());
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
		_query_table_filters := global.form_table_query($4);
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
--		open $1 for execute 'select * from inventory_smart.raise_notice order by t desc';
		RETURN $1;
	end
$function$
;
