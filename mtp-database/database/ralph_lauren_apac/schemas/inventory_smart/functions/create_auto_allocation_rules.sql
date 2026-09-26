--liquibase formatted sql
--changeset liquibase:srishti.kumari@impactanalytics.co:added rule_definitions_jsonb runOnChange:true stripComments:false splitStatements:false context:MTP-47081 labels:MTP-47081
--comment: added rule_definitions_jsonb MTP-47081
--rollback: SELECT 1
drop function if exists inventory_smart.create_auto_allocation_rules(_master_input jsonb, _mapping_input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.create_auto_allocation_rules(_master_input jsonb, _mapping_input jsonb)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
declare 
_sql text;
_rule_code int8;
_key text;
_value text;
_keys text[];
_values text[];
_item jsonb;
_validity text;
/*select
	*
from
	inventory_smart.create_auto_allocation_rules('{"rule_name": "Sample Rule", "validity": "[2024-05-05,2025-05-05]", "is_active": true, "is_default": false, "rule_definitions": "(Freq=Monthly&3,10,22) AND(Release right away) AND(Threshold=0.7)", "updated_by": 155, "created_by": 155}',
	'[{"rule_type": 1, "rule_definitions": {"frequency_type": "daily", "start_date": "2024-03-21", "end_date": "2024-03-28", "day_of_week": ["Monday", "Wednesday"], "week_of_month": [1, 3], "day_of_month": [5, 15], "num_of_occurrence": 10}, "is_active": true, "updated_by": 155, "created_by": 155}, {"rule_type": 2, "rule_definitions": {"auto_release_type": "review-and-release"}, "is_active": true, "updated_by": 155, "created_by": 155}, {"rule_type": 3, "rule_definitions": {"threshold_type": "set-wos-rule", "condition": "<", "threshold": 0.5}, "is_active": true, "updated_by": 155, "created_by": 155}]')
	*/
begin 
	if EXISTS (SELECT 1 FROM jsonb_object_keys(_master_input)) then 
		_sql := 'INSERT INTO inventory_smart.alloc_rule_master(rule_name,validity,is_active,is_default,rule_definitions,created_by,updated_by,rule_definitions_jsonb,created_at) values(
						('|| case when _master_input->>'rule_name' is null then 'NULL' else quote_literal(_master_input->>'rule_name') end || ')::varchar,
						('|| case when _master_input->>'validity' is null then 'NULL' else quote_literal(_master_input->>'validity') end || ')::daterange,
						('|| case when _master_input->>'is_active' is null then 'NULL' else quote_literal(_master_input->>'is_active') end || ')::bool,
						('|| case when _master_input->>'is_default' is null then 'NULL' else quote_literal(_master_input->>'is_default') end || ')::bool,
						('|| case when _master_input->>'rule_definitions' is null then 'NULL' else quote_literal(_master_input->>'rule_definitions') end || ')::varchar,
						('|| case when _master_input->>'created_by' is null then 'NULL' else quote_literal(_master_input->>'created_by') end || ')::int4,
						('|| case when _master_input->>'updated_by' is null then 'NULL' else quote_literal(_master_input->>'updated_by') end || ')::int4,
						('|| case when _master_input->>'rule_definitions_jsonb' is null then 'NULL' else quote_literal(_master_input->>'rule_definitions_jsonb') end || ')::jsonb,
						('|| quote_literal(now()) || ')::timestamp 
						) returning rule_code;';
		raise notice 'master sql: %', _sql;
		execute _sql into _rule_code;
		RAISE NOTICE 'Inserted into alloc_rule_master with rule_code: %', _rule_code;
	end if;

	if jsonb_array_length(_mapping_input) > 0 then
		for _item in select * from jsonb_array_elements(_mapping_input) loop
			for _key in select * from jsonb_each_text(_item) loop
			end loop;
			
			_sql := 'INSERT INTO inventory_smart.alloc_rule_type_mapping(rule_code, rule_type, rule_definitions, is_active, created_by, updated_by, created_at) values(
						('|| _rule_code ||')::int8,
						('|| case when _item->>'rule_type' is null then 'NULL' else quote_literal(_item->>'rule_type') end || ')::int4,
						('|| case when _item->>'rule_definitions' is null then 'NULL' else quote_literal(_item->>'rule_definitions') end || ')::jsonb,
						('|| case when _item->>'is_active' is null then 'NULL' else quote_literal(_item->>'is_active') end || ')::bool,
						('|| case when _item->>'created_by' is null then 'NULL' else quote_literal(_item->>'created_by') end || ')::int4,
						('|| case when _item->>'updated_by' is null then 'NULL' else quote_literal(_item->>'updated_by') end || ')::int4,
						('|| quote_literal(now()) || ')::timestamp
						);';
		raise notice 'mapping sql: %', _sql;
					execute _sql;
				RAISE NOTICE 'Inserted into alloc_rule_type_mapping for rule_code: %', _rule_code;
		end loop;
	end if;
	return _rule_code;
end
$function$
;