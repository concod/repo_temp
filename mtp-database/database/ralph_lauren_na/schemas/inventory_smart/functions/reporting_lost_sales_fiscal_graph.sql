--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_fiscal_graph runOnChange:true stripComments:false splitStatements:false context:Release_1_5 labels:MTP-40466
--comment: optimised query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_fiscal_graph(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_fiscal_graph(input refcursor, jsonb, jsonb)
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
		_cache_sp text := '.reporting_lost_sales_fiscal_graph';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.loss_units}';
		_channel text;
	begin 		
		_query_pa := global.form_main_table_filters(
		  'product_attributes_filter',
		  $2
		);
		_query_sa := global.form_main_table_filters(
		  'store_attributes_filter',
		  $3
		);
		_channel := inventory_smart.get_channel_from_input($3);
	_query_combine := '
			with paf as (
				select distinct article FROM global.product_attributes_filter '||_query_pa||'
			),
			saf as (			
				select store_code FROM global.store_attributes_filter '||_query_sa||'
			),
			article_lost_unit as(
				select                 
					store_code,
                    fiscal_week,
                    fiscal_year,
                    lost_units,
                    lost_sales
                 from inventory_smart.loss_units lu
                 join paf on paf.article = lu.product_hierarchy
			)	
			select 
				fiscal_week,
                fiscal_year,
                SUM(COALESCE(lost_units, 0)) as lost_units,
                ROUND(SUM(COALESCE(lost_sales, 0)::numeric), 2) as lost_sales
				from
				article_lost_unit lu
                join saf using(store_code)
				group by fiscal_week, fiscal_year
                order by fiscal_year desc, fiscal_week desc
			';
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
		RETURN $1;
	end
$function$
;