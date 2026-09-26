--liquibase formatted sql
--changeset liquibase:extract_dependencies runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for extract_dependencies
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.extract_dependencies(_sql text);
CREATE OR REPLACE FUNCTION cache.extract_dependencies(_sql text)
 RETURNS TABLE(dep_name character varying, n_tup_upd bigint, n_tup_ins bigint, n_tup_del bigint, n_tup_hot_upd bigint, n_live_tup bigint, n_dead_tup bigint)
 LANGUAGE plpgsql
 PARALLEL SAFE
AS $function$
#variable_conflict use_column
	declare
	/*
	 * Function/Procedure name: cache.extract_dependencies
	 * Created by: Ashish Gupta
	 * Created at: 11-Dec-2022
	 * No of input parameter: 1
	 * Parameter Description : 
	 * $1 = _sql
	 * Purpose: 
	 */
		_plan jsonb;
	begin
		raise notice 'Flow: extract_dependencies';
		execute ('EXPLAIN (FORMAT JSON) ' || _sql) into _plan;
		return query with recursive extract_all as (
		  select 
		    plan.key as path, 
		    plan.value as value 
		  from 
		    jsonb_array_elements(_plan) vals, 
		    jsonb_each(
		      (vals->>'Plan')::jsonb
		    ) plan 
		  union all 
		  select 
		    path || '.' || coalesce(
		      obj_key, 
		      (arr_key - 1)::text
		    ), 
		    coalesce(obj_value, arr_value) 
		  from 
		    extract_all 
		    left join lateral jsonb_each(
		      case jsonb_typeof(value) when 'object' then value end
		    ) as o(obj_key, obj_value) on jsonb_typeof(value) = 'object' 
		    left join lateral jsonb_array_elements(
		      case jsonb_typeof(value) when 'array' then value end
		    ) with ordinality as a(arr_value, arr_key) on jsonb_typeof(value) = 'array' 
		  where 
		    obj_key is not null 
		    or arr_key is not null
		) 
		select
		    concat(schemaname, '.', relname)::varchar as dep_name,
		    n_tup_upd, 
			n_tup_ins, 
			n_tup_del, 
			n_tup_hot_upd, 
			n_live_tup, 
			n_dead_tup
		from (
		    select 
		      replace(value::varchar, '"', '')::varchar as relname 
		    from 
		      extract_all 
		    where 
		      "path" like '%Relation Name%'
		    group by
		      1
		  ) plan
		  join pg_stat_user_tables psu using(relname);
	END
$function$
;
