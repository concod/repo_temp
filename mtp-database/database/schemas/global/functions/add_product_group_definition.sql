--liquibase formatted sql
--changeset liquibase:add_product_group_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_product_group_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_group_definition(input jsonb, integer);
CREATE OR REPLACE FUNCTION global.add_product_group_definition(input jsonb, integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$2]::text[];
	_query text;
	_pgd_code int;
	_rules int[];
	_rule int;
	_mapping text[];
	_mapping_query text;
	_uq_rule_names int := 0;
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
			if _key = 'rules' then
				_rules := replace(replace(_value, '[', '{'), ']', '}')::text[];
				select count(*) into _uq_rule_names from (select lower(name) from "global".product_group_rules where pgr_code = any(_rules) group by 1 having count(*) > 1) x;
			else
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
			end if;
		end loop;
		if _uq_rule_names > 0 then
			raise EXCEPTION 'Few rules have dulpicate names.';
		else
			_query := 'INSERT INTO "global".product_group_definitions (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning pgd_code;';
			execute _query into _pgd_code;
			FOREACH _rule in array _rules loop
				_mapping := array_append(_mapping, ('(' || _pgd_code || ', ' || _rule || ')'));
			end loop;
			_mapping_query := 'INSERT INTO "global".product_group_definitions_rules_mapping (pgd_code, pgr_code) VALUES ' || (ARRAY_TO_STRING(_mapping, ', ', '')) || ';';
			execute _mapping_query;
			return query execute ('select ' || _pgd_code);
		end if;
	end $function$
;
