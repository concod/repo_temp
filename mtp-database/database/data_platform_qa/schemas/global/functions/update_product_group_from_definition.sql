--liquibase formatted sql
--changeset liquibase:update_product_group_from_definition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_product_group_from_definition
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_group_from_definition(input integer, jsonb, integer[], text[], integer);
CREATE OR REPLACE FUNCTION global.update_product_group_from_definition(input integer, jsonb, integer[], text[], integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
/*
 * Creates a product group from definition ids.
 * 
 * $1 - product group metadata
 * $2 - definitions {}
 *
 * $3 - Exclude product ids. ["pc1" ,"pc2]
 * $4 - User id.
 */
	declare
	_key text;
	_value text;
	_vals text[] := array[('updated_by = ' || $5), ('updated_at = now()')]::text[];
	_query text;
	_pg_code int := $1;
	_pgd integer;
	_pseudo_rule text;
	_combined_pseudo_rules text := '';
	_combined_rules_code integer[];
	_rules integer[];
	_product_fetch_query text := '';
	_excluded_entity_ids text[] := $4;
	_definition_update_query text;
	_group_mapping_insert_query text := '';
	_pg_mapping_cleanup_query text;
	_pg_defn_mapping_cleanup_query text;
	begin
		if cardinality($3) < 1 then
			raise EXCEPTION 'Atleast one definition id should be passed.';
		end if;
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			-- group table columns
			_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
		end loop;
	
	_query := 'update "global".product_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where pg_code = ' || $1 || ';';
	execute _query;

	-- get pseudo rule and pgr rule codes
	for _pgd, _pseudo_rule, _rules in select pgd.pgd_code, concat(pgd.pseudo_code), array_agg(pgr.pgr_code)
		from global.product_group_definitions pgd 
		join global.product_group_definitions_rules_mapping pgdrm 
		on pgd.pgd_code  = pgdrm.pgd_code 
		join 
		global.product_group_rules pgr 
		on pgdrm.pgr_code  = pgr.pgr_code
		where pgd.pgd_code =any($3)
		group by 1 loop
		if _combined_pseudo_rules = '' then 
			_combined_pseudo_rules := '(' || _pseudo_rule || ')';
		else 
			_combined_pseudo_rules := _combined_pseudo_rules || ' OR (' || _pseudo_rule || ')';
		end if;
		raise notice 'code : %', _pseudo_rule;
		raise notice '_rules: %', _rules;
		_combined_rules_code := array_cat(_combined_rules_code, _rules);
	end loop;
	
	if cardinality(_combined_rules_code) < 1 then
		raise exception 'No rules found for definition.';
	end if;
	_product_fetch_query := global.get_query_product_fetch_using_definition_rule(_combined_pseudo_rules, _combined_rules_code);
	_pg_defn_mapping_cleanup_query := 'update "global".product_group_definitions_rules_mapping set pg_code=null where pg_code=' || $1 || ';';
	execute _pg_defn_mapping_cleanup_query;
	IF cardinality(_excluded_entity_ids) > 0 then
		-- exclude products mentioned in exclude_ids.
	    _product_fetch_query := _product_fetch_query || ' and product_code <> all ('''|| concat($4) ||''' )';
	else
		-- update the definition group mapping , as the group will be definition based.
	   	_definition_update_query := 'update "global".product_group_definitions_rules_mapping set pg_code = ' || _pg_code || ' where pgd_code in (' || array_to_string($3, ', ', '') || ');';
	    raise notice '_definition_update_query: %',_definition_update_query;
	   	execute _definition_update_query;
	END IF;
	raise notice '_product_fetch_query: %s ', _product_fetch_query;
	_pg_mapping_cleanup_query := 'delete from "global".product_groups_mapping where pg_code = ' || $1 || ';';
	execute _pg_mapping_cleanup_query;
	-- insert products into product groups mapping matched from definitions.
	_group_mapping_insert_query := '
			INSERT INTO "global".product_groups_mapping
				(pg_code, product_code)
			select ' || _pg_code || ', pgr.product_code
			from ( select distinct product_code from ('|| _product_fetch_query ||') x ) pgr
			on conflict do nothing;';
	raise notice '_group_mapping_insert_query: % ', _group_mapping_insert_query;
	execute _group_mapping_insert_query;
	return query execute ('select ' || _pg_code);
	end 
$function$
;
