--liquibase formatted sql
--changeset liquibase:update_product_group_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_product_group_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_group_definition(input integer, jsonb, integer);
CREATE OR REPLACE FUNCTION global.update_product_group_definition(input integer, jsonb, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare
	_key text;
	_value text;
	_vals text[] := array[('updated_by = ' || $3), ('updated_at = now()')]::text[];
	_query text;
	_rules int[];
	_rule int;
	_mapping text[];
	_mapping_cleanup_query text;
	_mapping_query text;
	_uq_rule_names int := 0;
	_vals_pg_codes int[]; 
	_vals_pg_code int; 
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop 
			if _key = 'rules' then
				_rules := replace(replace(_value, '[', '{'), ']', '}')::text[];
				select count(*) into _uq_rule_names from (select lower(name) from "global".product_group_rules where pgr_code = any(_rules) group by 1 having count(*) > 1) x;
				raise notice '_rules%', _rules;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		if cardinality(_rules) < 1 then
			raise exception 'rules cannot be null/empty.';
		end if;
		if _uq_rule_names > 0 then
			raise EXCEPTION 'Few rules have dulpicate names.';
		else
			_query := 'update "global".product_group_definitions SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where pgd_code = ' || $1 || ';';
			--raise notice '%', _query;
	 		execute _query;
	 		
	 	   select replace(replace(jsonb_agg(distinct pgd.pg_code)::text, '[', '{'), ']', '}')::text[]
	 			into _vals_pg_codes 
				from  "global".product_group_definitions_rules_mapping pgd
				where pgd.pgd_code =$1
				and pgd.pg_code is not null ;

			if cardinality(_vals_pg_codes) > 0 then
				-- editing definition which is tagged to group
				FOREACH _vals_pg_code in array _vals_pg_codes loop
		 		FOREACH _rule in array _rules loop
					_mapping := array_append(_mapping, ('('||_vals_pg_code||', ' || $1 || ', ' || _rule || ')'));
				end loop;
				end loop;
			else
		 		FOREACH _rule in array _rules loop
					_mapping := array_append(_mapping, ('( null, ' || $1 || ', ' || _rule || ')'));
				end loop;
			end if;
			_mapping_cleanup_query := 'delete from  "global".product_group_definitions_rules_mapping where pgd_code = ' || $1 || ' ;';
			_mapping_query := 'INSERT INTO "global".product_group_definitions_rules_mapping (pg_code, pgd_code, pgr_code) VALUES ' || (ARRAY_TO_STRING(_mapping, ', ', '')) ||' ;';
		
			--raise notice '_mapping_cleanup_query%',_mapping_cleanup_query;
			--raise notice '_mapping_query%',_mapping_query;
			execute _mapping_cleanup_query;
			execute _mapping_query;
		end if;
	end $function$
;
