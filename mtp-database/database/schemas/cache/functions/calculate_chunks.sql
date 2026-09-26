--liquibase formatted sql
--changeset liquibase:calculate_chunks runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for calculate_chunks
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.calculate_chunks(_function_name character varying, _request jsonb);
CREATE OR REPLACE FUNCTION cache.calculate_chunks(_function_name character varying, _request jsonb)
 RETURNS TABLE(chunk jsonb)
 LANGUAGE plpgsql
AS $function$
declare
	_cols text[];
	_group_by_cols text[];
	_filter_query text;
	_final_query text;
	_missing_filters jsonb;
	_chunks jsonb;
	_r record;
	begin
		select
			concat('select * from "cache".' || _function_name || '_lookup ', filters)
			into _filter_query
		from
			cache.form_main_table_filters(_function_name || '_lookup',
			_request) as filters;
		raise notice '_filter_query: %', _filter_query;
		select 
		  jsonb_object_agg(
		    k, case when v is null then '[]' else v end
		  ) FILTER (
		    WHERE 
		      m
		  ), 
		  array_agg(k) FILTER (
		    WHERE 
		      g
		  ), 
		  jsonb_object_agg(k, g) FILTER (
		    WHERE 
		      not m
		  ) into _missing_filters,
		  _group_by_cols,
		  _chunks
		from 
		  (
		    select 
		      k,
		      v,
		      coalesce(g, false) g,
		      case when meta.k is null then true else false end as m 
		    from 
		      jsonb_each(_request) as inp(k, v) 
		      full outer join (
		      	select 
				  k, 
				  o, 
				  o <= pl as g 
				from 
				  cache.chunking_strategy, 
				  unnest(ph) WITH ORDINALITY AS a(k, o) 
				where 
				  function = _function_name 
				union 
				select 
				  k, 
				  o, 
				  o <= sl as g 
				from 
				  cache.chunking_strategy, 
				  unnest(sh) WITH ORDINALITY AS a(k, o) 
				where 
				  function = _function_name 
				union 
				select 
				  k, 
				  o, 
				  o <= tl as g 
				from 
				  cache.chunking_strategy, 
				  unnest(th) WITH ORDINALITY AS a(k, o) 
				where 
				  function = _function_name
		      ) as meta(k, o, g)
			using(k)
		) x;
		_missing_filters := case when _missing_filters is null then '{}'::jsonb else _missing_filters end;
		raise notice '_missing_filters: %', _missing_filters;
		raise notice '_group_by_cols: %', _group_by_cols;
		for _r in select * from jsonb_each(_chunks) as r("key", chunk_level) loop
			if _r.chunk_level then
				_cols := array_append(
				  _cols, 
				  (
				    '''' || _r."key" || ''', jsonb_build_array(
				    jsonb_build_object(''type'', ''list'', ''operator'', ''in'', ''values'', array_remove(array[' || replace(_r."key", '''', '''''') || '], NULL))
				  )'
				  )
				);
			else 
				_cols := array_append(
				  _cols, 
				  (
				    '''' || _r."key" || ''', jsonb_build_array(
				    jsonb_build_object(''type'', ''list'', ''operator'', ''in'', ''values'', array_remove(array_agg(distinct ' || replace(_r."key", '''', '''''') || '), NULL))
				  )'
				  )
				);
			end if;
		end loop;
		raise notice '_cols: %', _cols;
		_final_query := 'select jsonb_build_object(' || (
		  ARRAY_TO_STRING(_cols, ', ', '')
		) || ') || ''' || _missing_filters || ''' as chunk from (' || _filter_query || ') x
		group by ' || (
		  ARRAY_TO_STRING(_group_by_cols, ', ', '')
		);
		raise notice '_final_query: %', _final_query;	
		return query execute _final_query;
	end
$function$
;
