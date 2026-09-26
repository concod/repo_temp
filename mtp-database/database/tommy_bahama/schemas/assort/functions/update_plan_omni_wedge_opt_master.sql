--liquibase formatted sql
--changeset liquibase:update_plan_omni_wedge_opt_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_plan_omni_wedge_opt_master
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_plan_omni_wedge_opt_master(input jsonb);
CREATE 
OR REPLACE FUNCTION assort.update_plan_omni_wedge_opt_master(input jsonb) RETURNS void LANGUAGE plpgsql AS $function$ 
/*
Function/Procedure name: assort.update_plan_omni_wedge_opt_master
Created by: Hemant Kumar Singh
Created at: 17-jun-2022
No of input parameter: 1
Parameter Description : $1 = json  
Purpose: This function been created and updated on  plan_omni_wedge_opt_master table 
Calling Statement:
SELECT assort.update_plan_omni_wedge_opt_master('{
	"omni_wedge_data": [{
			"source_plan_code": 5013,
			"source_choice_id": "$115-$145---choice_1",
			"attribute_value": {
				"msrp": "130",
				"buy_units": 635.0,
				"lock_choice": "false",
				"selling_collection": "iconic",
				"GLOBAL STYLE NUMBER": "$115-$145---style_1",
				"plm_primary_fabrication": "cotton"
			},
			"destination_plan_code": 1596,
			"destination_choice_id": "$115-$145---choice_5",
			"destination_attribute_value": {
				"style_id": "< $19---Style---4",
				"total_qty": 96.0,
				"choice_name": "< $19---global-choice_5"
			},
			"source_levels": {
				"drop": "-",
				"l0_name": "Apparel/Footwear",
				"l1_name": "Footwear",
				"l2_name": "Footwear",
				"l3_name": "< $19"
			}
		},
		{
			"source_plan_code": 5013,
			"source_choice_id": "$115-$145---choice_1",
			"attribute_value": {
				"msrp": "130",
				"buy_units": 635.0,
				"lock_choice": "false",
				"selling_collection": "iconic",
				"GLOBAL STYLE NUMBER": "$115-$145---style_1",
				"plm_primary_fabrication": "cotton"
			},
			"destination_plan_code": 1596,
			"destination_choice_id": "$115-$145---choice_5",
			"destination_attribute_value": {
				"style_id": "< $19---Style---4",
				"total_qty": 96.0,
				"choice_name": "< $19---global-choice_5"
			},
			"source_levels": {
				"drop": "-",
				"l0_name": "Apparel/Footwear",
				"l1_name": "Footwear",
				"l2_name": "Footwear",
				"l3_name": "< $19"
			}
		}
	]
}');
Hemant Kumar Singh:getting insert and updated on plan_omni_wedge_opt_master table
*/
declare _query text;
_source_plan_code integer;
_source_choice_id text;
_attribute_value jsonb;
_destination_plan_code integer;
_destination_choice_id text;
_destination_attribute_value jsonb;
_source_level jsonb;
_input_json jsonb;
_outerkey text;
_outervalue text;
_key text;
_value text;
begin for _outerkey, 
_outervalue in 
SELECT 
  * 
FROM 
  jsonb_each_text($1) 
WHERE 
  value IS NOT NULL loop raise notice '%', 
  _outerkey;
if _outerkey = 'omni_wedge_data' then for _input_json in 
select 
  * 
from 
  jsonb_array_elements(_outervalue :: jsonb) loop for _key, 
  _value in 
SELECT 
  * 
FROM 
  jsonb_each_text(_input_json) 
WHERE 
  value IS NOT null loop if _key = 'source_plan_code' then _source_plan_code = _value;
elsif _key = 'source_choice_id' then _source_choice_id = _value;
elsif _key = 'attribute_value' then _attribute_value = _value;
elsif _key = 'destination_plan_code' then _destination_plan_code = _value;
elsif _key = 'destination_choice_id' then _destination_choice_id = _value;
elsif _key = 'destination_attribute_value' then _destination_attribute_value = _value;
elsif _key = 'source_levels' then _source_level = _value;
end if;
end loop;
_query = 'insert into 
                 assort.plan_omni_wedge_opt_master(source_plan_code,
                           source_choice_id,
                 attribute_value,
                 destination_plan_code,
                 destination_choice_id,
                 destination_attribute_value,
                 source_levels)  values  (' || _source_plan_code || ',''' || _source_choice_id || ''',''' || _attribute_value || ''',' || _destination_plan_code || ',''' || _destination_choice_id || ''',''' || _destination_attribute_value || ''',''' || _source_level || ''' ) on conflict (source_plan_code,source_choice_id,destination_plan_code,destination_choice_id)
                do
                  update set attribute_value = EXCLUDED.attribute_value ||''' || _attribute_value || ''', 
                  destination_attribute_value= EXCLUDED.destination_attribute_value||''' || _destination_attribute_value || ''';';
execute _query;
--raise notice '_query%',_query;
end loop;
end if;
end loop;
end $function$;
