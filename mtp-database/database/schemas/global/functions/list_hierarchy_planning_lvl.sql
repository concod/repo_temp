--liquibase formatted sql
--changeset liquibase:list_hierarchy_planning_lvl runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_hierarchy_planning_lvl
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.list_hierarchy_planning_lvl(jsonb);
CREATE OR REPLACE FUNCTION global.list_hierarchy_planning_lvl(jsonb)
 RETURNS TABLE(id integer, l0_name character varying, l1_name character varying, l2_name character varying, l3_name character varying, l4_name character varying, l5_name character varying, l6_name character varying, planning_level character varying)
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
    for _key, _value in SELECT * FROM jsonb_each_text($1::jsonb) --WHERE value IS NOT NULL
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
   _query_1 := 'select distinct * from global.assort_hierarchy_planning where ' || _query_wh || ' ;';
   raise notice 'Value %', _query_1;
   RETURN query execute _query_1;
end;
$function$
;
