--liquibase formatted sql
--changeset liquibase:create_tenant_hierarchy_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_tenant_hierarchy_config
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.create_tenant_hierarchy_config(input integer, jsonb, jsonb);
CREATE OR REPLACE FUNCTION global.create_tenant_hierarchy_config(input integer, jsonb, jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$ 
/*  
 * Function/Procedure name: global.create_tenant_hierarchy_config
 * Created by: Kailash Yadav
 * Created at: 15-Dec-2021
 * No of input parameter: 3
 * Parameter Description : $1 = Application name
 *                         $2 = JSON for attribute details 
 * 						   $3 = 	 
 * Purpose: This function been created to insert given attribute value in attribute_master if not found, 
 *  if same attribute found in attribute_master then update the and update the same attribute_code in applicatiom_master 
 * Calling Statement:   
 *  select
	global.create_tenant_hierarchy_config(2,
	'{"l0_name": [{"operator": "in", "type": "list", "values": ["Accessories", "Apparel"]}],
	 	"l1_name": [{"operator": "in", "type": "list", "values": ["MNS", "WNS", "Youth"]}]}',
	'{"attributes": [{"attribute_name": "aps",
	"attribute_value": "true" },
	{"attribute_name": "st%",
	"attribute_value": "false" },
	{"attribute_name": "min_attribute_cluster",
	"attribute_value": "1" },
	{"attribute_name": "max_performance_cluster",
	"attribute_value": "5" },
	{"attribute_name": "min_performance_cluster",
	"attribute_value": "1" }]}');
 * 
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Kailash Yadav    30-Jun-2022:    Replace application name with application code in $1   
 */

declare _passed BOOLEAN;
_query_level_select text;
_query_app text;
_query_insert text;
_query_h_insert text;
_query_delete text;
_query_select_lvl text;
_h_level text := false;
_h_value text;
_h_check_cnt integer := 0;
_h_check boolean;
_hierarchy_level_id integer := 0;
_h_count integer;
_h_match bool := false;
_c_p_h text;
_input_2 text;
_application_code integer;
begin begin _input_2 := '''' || $2 :: text || '''';
_query_level_select := 'select hierarchy_level_id,h_level from
     (select
        hierarchy_level_id,
        jsonb_object_agg(hierarchy_level, o) h_level
    from
        (
        select
            hierarchy_level_id,
            hierarchy_level,
            json_agg(o) as o
        from
            (
            select
                        hierarchy_level_id,
                        hierarchy_level,
                        jsonb_build_object(''values'', jsonb_agg(hierarchy_value), ''type'', ''list'', ''operator'', ''in'') as o
            from
                        global.tenant_hierarchy_levels thl
            group by
                        hierarchy_level_id,
                        hierarchy_level
        ) x
        group by
            hierarchy_level_id,
            hierarchy_level
    ) x
    group by
        hierarchy_level_id ) a
        where h_level = ' || _input_2 || ' limit 1 ';
execute _query_level_select into _hierarchy_level_id,
_h_level;
if _h_level is not null
and _hierarchy_level_id is not null then _h_match = true;
else _h_match = false;
end if;
exception when others then _h_match := false;
_hierarchy_level_id := 0;
raise notice 'Failure: Please check input paramater';
end;
--  raise notice '%','_h_match1'||_h_match;
-- raise notice '%','_hierarchy_level_id1'||_hierarchy_level_id;

_query_app := 'select application_code from global.application_master am
        where lower (name)=lower(''' || $1 || ''')';
execute _query_app into _application_code;
raise notice '%',
'_h_match' || _h_match;
-- if given hierarchy level is available then delete/ insert the attribute mapping
if _h_match = true then _query_delete := 'delete from global.tenant_hierarchy_mapping thm
      where hierarchy_level_id =' || _hierarchy_level_id || ' and  application_code = ' || _application_code;
--raise notice '%',$3::jsonb;
_query_insert := 'insert into global.tenant_hierarchy_mapping (hierarchy_level_id,attribute_type,attribute_value,application_code, is_active)
       select ' || _hierarchy_level_id || ' hierarchy_level_id, x.attribute_type, x.attribute_value,y.application_code ,true is_active
      from
      (select
        value->>''attribute_name'' as attribute_type,
        value->>''attribute_value'' as attribute_value
      from jsonb_array_elements((((''' || $3 :: varchar || ''')::jsonb)->>''attributes'')::jsonb) ) x join
        (select application_code from global.application_master am
        where lower (name)=lower(''' || $1 || ''')) y on 1=1';

--raise notice '%','_h_match' ||_h_match;
--  raise notice '%',_query_insert;
execute _query_delete;
execute _query_insert;
elsif _h_match = false then -- if given hierarchy level is not available then insert new hierachy into tenant_hierarchy_levels and tenant_hierarchy_mapping
begin
select
  max (hierarchy_level_id) into _hierarchy_level_id
from
  global.tenant_hierarchy_levels thl;
if _hierarchy_level_id is null then _hierarchy_level_id := 0;
end if;
exception when others then _hierarchy_level_id := 0;
end;
_hierarchy_level_id := _hierarchy_level_id + 1;
raise notice '%',
'_hierarchy_level_id' || _hierarchy_level_id;
_query_h_insert := 'insert into global.tenant_hierarchy_levels (hierarchy_level_id,hierarchy_level ,hierarchy_value  )
      (select ' || _hierarchy_level_id || ',
        key ,
           unnest (_value::text[]) _value
           from
           (
            select key ,
            replace (replace (_value::json ->> ''values'',''['',''{''),'']'',''}'')  _value
            from
        (select key , value::json->0   _value,
          value::jsonb _value1
          from (
          select
          key, value  from
          jsonb_each_text(''' || concat($2)|| ''') a) b) c)d)';
--raise notice '%','_query_h_insert'||_query_h_insert;
execute _query_h_insert;
_query_delete := 'delete from global.tenant_hierarchy_mapping thm
      where hierarchy_level_id =' || _hierarchy_level_id || ' and  application_code = ' || _application_code;
_query_insert := 'insert into global.tenant_hierarchy_mapping (hierarchy_level_id,attribute_type,attribute_value,application_code, is_active)
       select ' || _hierarchy_level_id || ' hierarchy_level_id, x.attribute_type, x.attribute_value,y.application_code ,true is_active
      from
      (select
        value->>''attribute_name'' as attribute_type,
        value->>''attribute_value'' as attribute_value
      from jsonb_array_elements((((''' || $3 :: varchar || ''')::jsonb)->>''attributes'')::jsonb) ) x join
        (select application_code from global.application_master am
        where lower (name)=lower(''' || $1 || ''')) y on 1=1';

execute _query_delete;
execute _query_insert;
end if;
--raise notice '%','_query_insert'||_query_insert;
--raise notice '%',_query_delete;
_passed := true;
return _passed;
exception when others then raise notice '%',
'Error' || sqlerrm;
_passed := FALSE;
return _passed;
end;
$function$
;
