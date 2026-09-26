--liquibase formatted sql
--changeset liquibase:add_product_group runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_product_group
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.add_product_group(input jsonb, text[], integer[], integer);
CREATE OR REPLACE FUNCTION global.add_product_group(input jsonb, text[], integer[], integer)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * Creates new product group.
 * 
 * 	$1 group metadata
 *  $2 added product ids.
 *  $3 added group ids.
 *  $4 user id

	select * from global.add_product_group( 
	'{"name": "pg-def-group-handbags", "special_classification": "manual", "selection_metadata": {"objective_metrics": null}}', 
	'{"111111111117", "191058010209", "191058010230", "191058010247", "191058010285"}','{}', 3)

	Author:
	Pradeep Nayak
 */
	declare
	_add_product_ids text[] := $2;
	_add_product_group_ids integer[] := $3;
	_key text;
	_value text;
	_keys text[] := array['created_by']::text[];
	_vals text[] := array[$4]::text[];
	_pg_code int;
	_query text;
	_add_products_query text;
	_add_products_from_group_query text;
	
	begin
		for _key, _value in SELECT * FROM jsonb_each_text($1) WHERE value IS NOT NULL loop
				_keys := array_append(_keys, _key);
				_vals := array_append(_vals, '''' || _value || '''');
		end loop;
		_query := 'INSERT INTO "global".product_groups (' || (ARRAY_TO_STRING(_keys, ', ', '')) || ') VALUES (' || (ARRAY_TO_STRING(_vals, ', ', '')) || ') returning pg_code;';
		execute _query into _pg_code;

		if cardinality(_add_product_ids) > 0 then
			-- add products to group
			_add_products_query := 'INSERT INTO "global".product_groups_mapping(pg_code, product_code) 
							(
								select ' || _pg_code || ', product_code from (
									select unnest('''|| concat(_add_product_ids) ||'''::text[]) as product_code
								) x group by product_code 
							) on conflict do nothing;
			';
			raise notice '_add_products_query :  %', _add_products_query;
			execute _add_products_query;
		end if;
	
		if cardinality(_add_product_group_ids) > 0 then
			-- add products imported from group ids.
			-- grouping by product_code, as there is constraint on pg_code + product_code.
			_add_products_from_group_query := 'INSERT INTO "global".product_groups_mapping(pg_code, product_code) 
						(
							select ' || _pg_code || ', product_code
							from "global".product_groups_mapping where pg_code = any ( ''' || concat(_add_product_group_ids) || ''')
						    group by product_code
						)  on conflict do nothing;
				';
			raise notice '_add_products_from_group_query: %', _add_products_from_group_query;
			execute _add_products_from_group_query;
		end if;
		return query execute ('select ' || _pg_code);
	end $function$
;
