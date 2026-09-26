--liquibase formatted sql
--changeset liquibase:reporting_excess_inventory_fiscal_week_graph runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for reporting_excess_inventory_fiscal_week_graph
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inventory_fiscal_week_graph(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inventory_fiscal_week_graph(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare
		_query_pa text := '';
		_query_sa text := '';
		_query_table_filters text := '';
		_query_combine text := '';
		_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_excess_inventory_fiscal_week_graph';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.excess_units}';
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
		_query_combine := '
			WITH product_master_filters_data AS (
			    SELECT 
					fiscal_week,
					fiscal_year,
					saf.store_code,
					article,
					max(excess_inv) as excess_inv,
					max(tot_inv) as tot_inv,
					max(week_qty) as week_qty,
					max(excess_inv_cost) as excess_inv_cost
				FROM (select product_code, article FROM global.product_attributes_filter ' || _query_pa || ') paf
			    join inventory_smart.excess_units eu on paf.article = eu.product_hierarchy
			    join (select store_code FROM global.store_attributes_filter ' || _query_sa || ') saf 
			    on saf.store_code = eu.store_code
				group by 1,2,3,4
			)
--			select * from product_master_filters_data
			,
			excess_units AS (
				select
					fiscal_week,
					fiscal_year,
					ROUND(coalesce(sum(excess_inv),0)::numeric,2) as excess_inv_sum,
					ROUND(coalesce(sum(tot_inv),0)::numeric,2) as inv_sum,
					ROUND(coalesce(sum(excess_inv_cost),0)::numeric,2) as excess_inv_cost_sum,
					ROUND(coalesce(sum(week_qty),0)::numeric,2) as unit_sold_sum
				from product_master_filters_data
				group by 1,2 order by fiscal_year desc, fiscal_week desc limit 52 offset 0
			)
			select * from excess_units';
		raise notice '%', _query_combine;
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
--		_query_table_filters := global.form_table_query($6);
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
