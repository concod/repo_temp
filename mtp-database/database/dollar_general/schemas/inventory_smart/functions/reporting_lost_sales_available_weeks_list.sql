--liquibase formatted sql
--changeset liquibase:reporting_lost_sales_available_weeks_list runOnChange:true stripComments:false splitStatements:false context:MTP-40664 labels:MTP-40664
--comment: MTP-40664 Add SP for Lost Sales available weeks list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_lost_sales_available_weeks_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_lost_sales_available_weeks_list(input refcursor, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
	declare 
		_query_pa text := '';
	 	_query_sa text := '';
	 	_query_pa_sa text := '';
	 	_query_combine text := '';
	 	_cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3);
		_cache_table_id text;
		_cache_schema text := 'inventory_smart';
		_cache_sp text := '.reporting_lost_sales_available_weeks_list';
		_cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
		_cache_dependencies text[] := '{inventory_smart.lost_sales}';
	BEGIN
		_query_pa := global.form_main_table_filters('product_attributes_filter', $2);
		_query_sa := global.form_main_table_filters('store_attributes_filter', $3);
		if LENGTH(_query_sa) > 0 and LENGTH(_query_pa) >0 then
			_query_sa:= ' AND ' || SUBSTRING(_query_sa, 8);
		end if;
		_query_pa_sa := _query_pa || _query_sa;
	
		_query_combine := '
			with lost_sales_data as (
			select 
				SUBSTRING(ls.fiscal_year_week::varchar(255), 5, 2) as fiscal_week,
				SUBSTRING(ls.fiscal_year_week::varchar(255), 1, 4) as fiscal_year,
				coalesce(sum(lost_units), 0) as lost_units,
				round(coalesce(sum(lost_sales), 0)::decimal, 2) as lost_sales
			from inventory_smart.lost_sales ls 
			' || _query_pa_sa || '
			group by 1,2
		),
		
		final_result as (
			select 
				*
			from lost_sales_data
			where lost_units>0
			order by fiscal_year desc, fiscal_week desc 
			limit 52 offset 0
		)
		
		select * from final_result';
		raise notice '%',_query_combine; 	
--		open $1 for execute _query_combine; 	
		select
		  * 
		from 
		  cache.wrap_sp(
			_cache_schema, _cache_sp, _cache_payload, 
			_query_combine, _cache_dependencies, 
			_cache_key_pattern
		  ) into _cache_table_id;
		perform set_config(
		  'myvars.cache_table_id', _cache_table_id, 
		  true
		);
		open $1 for execute 'select * from "cache"."' || _cache_table_id || '" X '; 
	
		RETURN $1;
	END;
$function$
;