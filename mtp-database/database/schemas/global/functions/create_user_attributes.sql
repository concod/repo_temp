--liquibase formatted sql
--changeset liquibase:create_user_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_user_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_user_attributes(input jsonb);
CREATE OR REPLACE FUNCTION global.create_user_attributes(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$ 
/*
 * Function/Procedure name: global.create_user_attributes
 * Created by: Kailash Yadav
 * Created at: 06-Jun-2022
 * No of input parameter: 1
 * Parameter Description : $1 = JSON to polulate/update User attributes table
 * Purpose: This function will be used to create and and update data into user_attributes table. If user attributes available then create records otherwise update the attribute values.
 * Calling Statement:
select
  *
from
  global.create_user_attributes ('{"user_code": "1", "attribute_name": "last_login", "attribute_value":"2021-09-23 20:41:15.857331" }')
 *
 * if any modification done in same function/procedure please record the changes in below format
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 *
 */
declare _key text;
_val text;
_keys text[];
_vals text[];
_user_code_val text;
_attr_value text;
_query text;
begin for _key, 
_val in (
  select 
    key, 
    value 
  from 
    jsonb_each_text ($1 :: jsonb)
) loop if _key = 'user_code' then _user_code_val := _key;
elseif _key = 'attribute_value' then _attr_value := _val;
end if;
_keys := array_append(_keys, _key);
_vals := array_append(_vals, '''' || _val || '''');
end loop;
_query := 'insert into global.user_attributes(user_code,attribute_name,attribute_value,created_at)
      values(' || (
  ARRAY_TO_STRING(_vals, ', ', '')
) || ', now())
      on conflict (user_code,attribute_name)
      do
      update set attribute_value = ''' || _attr_value || ''', created_at = now(); ';
raise notice '%', 
_query;
execute _query;
end $function$
;
