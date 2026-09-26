--liquibase formatted sql
--changeset liquibase:reporting_excess_inventory_fiscal_week_graph_old runOnChange:true stripComments:false splitStatements:false context:MTP-22574 labels:MTP-22574
--comment: bugfix: MTP-22574 - data mismatch issue
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inventory_fiscal_week_graph_old(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inventory_fiscal_week_graph_old(input refcursor, jsonb, jsonb)
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
		_cache_sp text := '.reporting_excess_inventory_fiscal_week_graph_old';
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
		_query_combine := format($$
			SELECT
				    fiscal_week,
					fiscal_year,
					SUM(excess_inv) as excess_inv_sum,
					SUM(tot_inv) as inv_sum,
					SUM(week_qty) as unit_sold_sum,
					ROUND(COALESCE(SUM(excess_inv_cost),0)::numeric, 2) as excess_inv_cost_sum
			FROM inventory_smart.excess_units eu
			 JOIN (
				SELECT distinct article FROM global.product_attributes_filter
				%1$s
			) paf on eu.product_hierarchy = paf.article
			 JOIN (
				SELECT store_code FROM global.store_attributes_filter
				%2$s
			) saf using(store_code)
			GROUP BY fiscal_week, fiscal_year
			ORDER BY fiscal_year desc, fiscal_week desc
			$$, _query_pa, _query_sa);
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