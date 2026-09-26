--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:update_product_group_bugfix runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:update_product_group_bugfix
--comment: added default param to delete group data if passed true
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.update_product_group(input integer, jsonb, text[], text[], integer, boolean);
CREATE OR REPLACE FUNCTION global.update_product_group(input integer, jsonb, text[], text[], integer, boolean default True)
 RETURNS TABLE(pk integer)
 LANGUAGE plpgsql
AS $function$
/*
 * 
 * Updates product group.
 *  $1 pgcode
 * 	$2 group metadata
 *  $3 added product ids.
 * 	$4 removed product ids
 *  $5 added group ids.
 * 	$6 removed group ids..
 *  $7 user id

	select * from global.update_product_group(170, 
	'{"name": "pg-def-group-handbags", "special_classification": "manual", "selection_metadata": {"objective_metrics": null}}', 
	'{"111111111117", "191058010209", "191058010230", "191058010247", "191058010285"}', '{}', '{}', '{}', 3)
	Author:
	Pradeep Nayak
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
	_pg_code int;
	_mapping_query text;
	_pg_mapping_query text;
	_mapping_cleanup_query text;
	_pg_mapping_cleanup_query text;
	_group_remove_products_query text;
	_group_remove_product_groups_query text;
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
		_mapping_cleanup_query := 'update "global".product_group_definitions_rules_mapping set pg_code = null where pg_code = ' || $1 || ';';
		raise notice '_mapping_cleanup_query: %', _mapping_cleanup_query;
		execute _mapping_cleanup_query;
		_mapping_cleanup_query := 'delete from "global".product_groups_mapping where pg_code = ' || $1 || ';';
		raise notice '_mapping_cleanup_query: %', _mapping_cleanup_query;
		if $6 is true then
			execute _mapping_cleanup_query;
		end if;
		/*if cardinality(_remove_product_ids) > 0 then
			-- remove product ids 
			_group_remove_products_query := 'delete from "global".product_groups_mapping where pg_code = '|| $1 || ' and product_code = any ( ''' || concat(_remove_product_ids) ||''');';
			raise notice '_group_remove_products_query: %', _group_remove_products_query;
			execute _group_remove_products_query;
		end if;
	
		if cardinality(_remove_product_group_ids) > 0 then
			-- remove products which got imported from product group ids.
			_group_remove_product_groups_query := 'delete from "global".product_groups_mapping where pg_code = ' || $1 || ' and ref_pg_code = any( ''' || concat($6) || ''');';
			raise notice '_remove_product_group_ids : %', _remove_product_group_ids;
			execute _group_remove_product_groups_query;
		end if;*/
		

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
