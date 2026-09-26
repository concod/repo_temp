--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:add_tenant_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-19300 labels:liquibase_project_start
--comment: Updating all the columns on conflict
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_tenant_attributes(input jsonb);
CREATE OR REPLACE FUNCTION global.add_tenant_attributes(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ declare _key text;
_value text;
_value1 text;
_value2 text;
_keys text[] := array[ 'status' ] :: text[];
_vals text[] := array[ 'true' ] :: text[];
_attr_value text;
_query text;
_stores json;
_sg_code int;
_ref_sg_codes text[];
_mapping_query text;
_sg_mapping_query text;
begin for _value in 
SELECT 
  value 
FROM 
  jsonb_each_text($1) 
WHERE 
  value IS NOT NULL loop for _value in 
SELECT 
  value 
FROM 
  jsonb_array_elements(_value :: jsonb) loop for _key, 
  _value in 
select 
  key, 
  value 
from 
  jsonb_each_text(_value :: jsonb) loop if _key = 'attribute_value' then _keys := array_append(_keys, _key);
_vals := array_append(_vals, '''' || _value || '''');
_attr_value := _value;
raise notice '%', 
_attr_value;
else _keys := array_append(_keys, _key);
_vals := array_append(_vals, '''' || _value || '''');
end if;
end loop;

-- Constructing dynamic update command on conflict
declare
v_update_stmt text;

begin
v_update_stmt := 'UPDATE SET ';
for v_idx IN 1 .. array_length(_keys, 1) LOOP
  v_update_stmt := v_update_stmt || _keys[v_idx] || ' = ' || _vals[v_idx];
  IF v_idx < array_length(_keys,1) THEN
      v_update_stmt := v_update_stmt || ', ';
    end if;
  end loop;

_query := 'insert into global.tenant_attribute_master(' || (
  ARRAY_TO_STRING(_keys, ', ', '')
) || ') VALUES (' || (
  ARRAY_TO_STRING(_vals, ', ', '')
) || ') 
        on conflict (name,attribute_type, application_code) do 
        '|| v_update_stmt || ';';
execute _query;
raise notice 'query %', 
_query;
_keys := array[ 'status' ] :: text[];
_vals := array[ 'true' ] :: text[];
_attr_value := '';
end;
end loop;
end loop;
end $function$
;