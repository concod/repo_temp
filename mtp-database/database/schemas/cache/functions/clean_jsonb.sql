--liquibase formatted sql
--changeset liquibase:clean_jsonb runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for clean_jsonb
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cache.clean_jsonb(jsonb);
CREATE OR REPLACE FUNCTION cache.clean_jsonb(jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
	_res jsonb;
begin
	select 
	  jsonb_object_agg(key, val) into _res 
	from 
	  (
	    select 
	      key, 
	      jsonb_agg(val) as val 
	    from 
	      (
	        select 
	          key, 
	          val::jsonb as val, 
	          case when (val::jsonb)->>'type' = 'list' then 
	          jsonb_array_length(((val::jsonb)->>'values')::jsonb)
	          else length((val::jsonb)->>'values') end as len 
	        from 
	          (
	            select 
	              key, 
	              jsonb_array_elements_text(val) as val 
	            from 
	              (
	                select 
	                  key, 
	                  value :: jsonb as val, 
	                  jsonb_array_length(value :: jsonb) as len 
	                from 
	                  jsonb_each_text($1)
	              ) l0 
	            where 
	              len > 0
	          ) l1
	      ) l2 
	    where 
	      len > 0 
	    group by 
	      key
	  ) l3;
	return case when _res is null then '{}' else _res end;
end
$function$
;
