--liquibase formatted sql
--changeset liquibase:update_product_group_with_upsert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_product_group_with_upsert
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_group_with_upsert(input integer, jsonb, text[], text[], integer);
CREATE OR REPLACE FUNCTION global.update_product_group_with_upsert(input integer, jsonb, text[], text[], integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * Updates product group.
 *  $1 pgcode
 * 	$2 group metadata
 *  $3 added product ids.
 *  $4 added group ids.
 *  $5 user id

	select * from global.update_product_group_with_upsert(170, 
	'{"name": "pg-def-group-handbags", "special_classification": "manual", "selection_metadata": {"objective_metrics": null}}', 
	'{"111111111117", "191058010209", "191058010230", "191058010247", "191058010285"}', '{}',  3)
	Author:
	Gautam Baruah
 */
	declare
	_add_product_ids text[] := $3;
	--_remove_product_ids text[] := $4;
	_add_product_group_ids integer[] := $4;
	--_remove_product_group_ids integer[] := $6;
	_key text;
	_value text;
	_vals text[] := array[('updated_by = ' || $5), ('updated_at = now()')]::text[];
	_query text;
	_definitions json;
	_products json;
	_mapping_query text;
	_add_products_query text;
	_add_products_from_group_query text;
	begin
		-- updating general data with respect to pg_code (from group meta data)
		for _key, _value in SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL loop
			if _key = 'products' then
				_products := _value;
			elseif _key = 'definitions' then
				_definitions := _value;
			else
				_vals := array_append(_vals, (_key || ' = ''' || _value || ''''));
			end if;
		end loop;
		_query := 'update "global".product_groups SET ' || (ARRAY_TO_STRING(_vals, ', ', '')) || ' where pg_code = ' || $1 || ';';
		execute _query;
		
		if cardinality(_add_product_ids) > 0 then
			-- add products to group
			_add_products_query := 'INSERT INTO "global".product_groups_mapping(pg_code, product_code) 
							(
								select ' || $1 || ', product_code from (
									select unnest('''|| concat(_add_product_ids) ||'''::text[]) as product_code
								) x group by product_code 
							) on conflict do nothing;
			';
			raise notice '_add_products_query :  %', _add_products_query;
			execute _add_products_query;
		end if;
	
		if cardinality(_add_product_group_ids) > 0 then
			-- add products imported from group ids.
			-- doing group by product code as there is constraint on pg_code + product_code.
			_add_products_from_group_query := 'INSERT INTO "global".product_groups_mapping(pg_code, product_code) 
						(
							select ' || $1 || ', product_code
							from "global".product_groups_mapping where pg_code = any ( ''' || concat(_add_product_group_ids) || ''')
						    group by product_code
						)  on conflict do nothing;
				';
			raise notice '_add_products_from_group_query: %', _add_products_from_group_query;
			execute _add_products_from_group_query;
		end if;
	
		
	end $function$
;