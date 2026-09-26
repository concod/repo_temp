--liquibase formatted sql
--changeset liquibase:update_allocated_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_allocated_units
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_allocated_units(character varying, character varying, character varying, character varying, character varying, integer);
CREATE OR REPLACE FUNCTION inventory_smart.update_allocated_units(character varying, character varying, character varying, character varying, character varying, integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 /* 
  */
 declare
 	allocation_code text := $1;
 	article text := $2;
 	store text := $3;
 	dc text := $4;
 	size text := $5;
 	allocated_value int := $6;
 	index int;
 	index_query text;
 	update_query text;
 	where_clause text;
 
begin
	where_clause = 'WHERE allocation_code = ''' || allocation_code ||''' and article = ''' || article || ''' and store = ''' || store || '''';
	index_query = '
		SELECT COALESCE(array_position(packs_allocated, ''' || size || ''') - 1, cardinality(packs_allocated) + 1)
		FROM (
			SELECT TRANSLATE(((pack_dc_allocation->>'''|| dc ||''')::json->>''packs_allocated'')::text, ''[]'', ''{}'')::text[] packs_allocated
			FROM inventory_smart.create_allocation_result_flat_gurobi carfg
			' || where_clause || '
			and retail_size_cd = ''' || size ||''') foo';
	raise notice ' %', index_query;
	execute index_query into index;
	update_query = '
		UPDATE inventory_smart.create_allocation_result_flat_gurobi
		SET pack_dc_allocation = jsonb_set(pack_dc_allocation::jsonb, ''{'||dc||',packs_allocated_qty,'||index||'}'','''||allocated_value||''')
		' || where_clause;
		raise notice ' %', update_query;
	execute update_query;
	update_query = '
		UPDATE inventory_smart.create_allocation_result_flat_gurobi
		SET allocated_total = ' || allocated_value || '
		' || where_clause || '
		and retail_size_cd = ''' || size ||'''';
	execute update_query;
         end
 $function$
;
