--liquibase formatted sql
--changeset liquibase:update_hierarchy_planning_lvl runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_hierarchy_planning_lvl
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_hierarchy_planning_lvl(jsonb, character varying);
CREATE OR REPLACE FUNCTION global.update_hierarchy_planning_lvl(jsonb, character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$

declare
_key text:= '';
_value text := '';
_keys text[][];
_values text[][];
_col text;
_query_1 text := '';
v_q text;
_dat jsonb;
_fin_val text;
_query_wh text := '';
begin
    for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb) 
    loop
            _keys := array_append(_keys,_key);
            _values := array_append(_values,_value);
    end loop;
    for i in 1 .. array_upper(_keys,1)
    LOOP
       _dat := json_array_elements(_values[i]::json);
       _fin_val := replace(replace(array_agg(_dat->'values')::TEXT,'\',''),'"','');
       _fin_val := replace(replace(_fin_val::TEXT,'{[',E'(\''),']}',E'\')')::TEXT;
       _fin_val := replace(_fin_val,', ',E'\',\'');
       _query_wh :=  _query_wh || _keys[i] || ' in ' || _fin_val || ' and ';
       raise notice 'Value %', _query_wh;
   END LOOP;
   _query_wh := left(_query_wh,-4);
   _query_1 := E'update global.assort_hierarchy_planning set planning_level = \''|| $2::varchar || E'\' where ' || _query_wh || ';';
   raise notice 'Value %', _query_1;
   execute _query_1;
end;
$function$
;
