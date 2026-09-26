--liquibase formatted sql
--changeset liquibase:calculate_product_chunks runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for calculate_product_chunks
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.calculate_product_chunks(_function_name character varying, _request jsonb);
CREATE OR REPLACE FUNCTION cache.calculate_product_chunks(_function_name character varying, _request jsonb)
 RETURNS TABLE(chunk jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_main_input jsonb := '{}';
	_cols text[];
	_group_by_cols text[];
	_filter_query text;
	_final_query text;
	_missing_filters jsonb;
	_r record;
	begin
		create temp table request_analyser on commit drop as 
		select 
		  coalesce(inp."key", cs.attribute_name) as "key", 
		  value, 
		  case when cs.chunk_level then true else false end as chunk_level, 
		  case when pal.attribute_name is null then false else true end as is_pa, 
		  case when pal.is_null_allowed is null 
		  or pal.is_null_allowed then true else false end as is_null_allowed 
		from 
		  jsonb_each($2) inp full 
		  outer join (
		    select 
		      attribute_name, 
		      hierarchy_level, 
		      true as chunk_level 
		    from 
		      global.product_attributes_list 
		    where 
		      hierarchy_level <= (
		        select 
		          "level" 
		        from 
		          "cache".chunking_strategy 
		        where 
		          "function" = $1 
		          and dimention = 'product'
		      )
		  ) cs on inp.key = cs.attribute_name 
		  left join global.product_attributes_list pal on coalesce(inp."key", cs.attribute_name) = pal.attribute_name;
		----------------------------------------------
		SELECT 
		  jsonb_object_agg(
		    "key", case when value is null then '[]' else value end
		  ) into _main_input 
		FROM 
		  request_analyser 
		where 
		  is_pa 
		  and not is_null_allowed;
		----------------------------------------------
		SELECT 
		  jsonb_object_agg(
		    "key", case when value is null then '[]' else value end
		  ) into _missing_filters 
		FROM 
		  request_analyser 
		where 
		  is_null_allowed;
		_missing_filters := case when _missing_filters is null then '{}' else _missing_filters end;
		----------------------------------------------
		for _r in 
		select 
		  "key", 
		  chunk_level 
		FROM 
		  request_analyser 
		where 
		  is_pa 
		  and not is_null_allowed loop
			if _r.chunk_level then
				_cols := array_append(
				  _cols, 
				  (
				    '''' || _r."key" || ''', jsonb_build_array(
				    jsonb_build_object(''type'', ''list'', ''operator'', ''in'', ''values'', array_remove(array[' || _r."key" || '], NULL))
				  )'
				  )
				);
				_group_by_cols := array_append(_group_by_cols, _r."key");
			else 
				_cols := array_append(
				  _cols, 
				  (
				    '''' || _r."key" || ''', jsonb_build_array(
				  jsonb_build_object(''type'', ''list'', ''operator'', ''in'', ''values'', array_remove(array_agg(distinct ' || _r."key" || '), NULL))
				  )'
				  )
				);
			end if;
		end loop;
		----------------------------------------------
		_filter_query := global.form_attribute_table_filters_v2(
		  'product_attributes', 'product_code', 
		  _main_input
		);
		raise notice '_filter_query: %', _filter_query;
		raise notice '_cols: %', _cols;
		raise notice '_missing_filters: %', _missing_filters;
		raise notice '_group_by_cols: %', _group_by_cols;
		_final_query := 'select jsonb_build_object(' || (
		  ARRAY_TO_STRING(_cols, ', ', '')
		) || ') || ''' || _missing_filters || ''' as chunk from (' || _filter_query || ') x
		group by ' || (
		  ARRAY_TO_STRING(_group_by_cols, ', ', '')
		);
		raise notice '%', _final_query;	
		return query execute _final_query;
	end
$function$
;
