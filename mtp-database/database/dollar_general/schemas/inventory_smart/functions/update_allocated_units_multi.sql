--liquibase formatted sql
--changeset liquibase:update_allocated_units_multi runOnChange:true stripComments:false splitStatements:false context:MTP-40575 labels:MTP-40575
--comment: MTP-90597 | bulk update changes	| bulk edit fix
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_allocated_units_multi(varchar, varchar, varchar[], jsonb, boolean);
CREATE OR REPLACE FUNCTION inventory_smart.update_allocated_units_multi(character varying, character varying, character varying[], input jsonb, boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
  /* 
  */
DECLARE
	allocation_code text := $1;
	_article text := $2;
	store text := $3;
	dc_size_value jsonb := $4;
	base_call boolean := $5;
	index int;
	query text;
	debug_query text;
	where_clause text; 
	dc text;
	size_value jsonb;
	_size text;
	allocated_value text;
	_units_allocated int;
	_other_article text;
	_temp_table_name text;
	_pack_size int;
    _updated_value int;
	_plan_type int;
	_plan_type_query text;
	_query_string text;
	_pm_date text;
	_query text;
	_packs text[];
	_pm_date_clause text;
begin
	_query = format($$SELECT date(created_at) FROM inventory_smart.plan_master WHERE plan_code = REPLACE(%L, 'edit_', '')$$, $1);
    execute _query into _pm_date;
    raise notice 'pm_date: %', _pm_date;

	_pm_date_clause = format($$ and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ $$, allocation_code, _article, store);

	where_clause = format($$ WHERE carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ and allocation_code = '%s' and article = '%s' and carfs.store = any ('%s') $$, allocation_code, _article, store);

	_plan_type_query = format($$SELECT type FROM inventory_smart.plan_master WHERE plan_code = REPLACE(%L, 'edit_', '')$$, $1);
	execute _plan_type_query into _plan_type;
	raise notice '_plan_type %', _plan_type;

	IF _plan_type = 6 OR  _plan_type = 7 THEN
		_query_string := 'dc_code, y.article, y.store, packs_allocated, packs_allocated_qty, packs_available_qty, 1 AS pack_size';	
	ELSE
   		_query_string := 'dc_code, y.article, y.store, packs_allocated, packs_allocated_qty, packs_available_qty, dpc.units_in_pack AS pack_size';
	END IF;

	_temp_table_name = format('flat_%s', REPLACE(_article, '-', ''));

	query = format($$
    CREATE TEMPORARY TABLE %2$s ON COMMIT DROP as
    select %3$s from(
      SELECT dc_code,
			       UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) packs_allocated,
			       UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::int[]) packs_allocated_qty,
			       UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_available_qty')::text, '[]', '{}'))::text[]) packs_available_qty,
			       article,
				   store
    	FROM (
        SELECT
          js.items AS dc_code,
          js.value AS inventory_data,
          article,
		  store
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
        %1$s
	      GROUP BY 1, 2, 3, 4
      ) x) y  
     LEFT JOIN inventory_smart.dc_pack_configuration dpc ON y.article = dpc.article and y.packs_allocated = dpc.pack_type_id
     $$, where_clause, _temp_table_name, _query_string);
    raise notice ' zero query%', query;
	EXECUTE query;
	query := format('SELECT inner_pack_size FROM global.product_attributes_filter paf  where article = %L', _article);
	raise notice ' query %', query;
	EXECUTE query INTO _pack_size;
	raise notice ' _pack_size %', _pack_size;
	FOR dc, size_value IN SELECT * FROM jsonb_each_text(dc_size_value) WHERE value IS NOT NULL LOOP
		FOR _size, allocated_value IN SELECT * FROM jsonb_each_text(size_value) WHERE value IS NOT NULL LOOP
			_updated_value = allocated_value::int / _pack_size;
			raise notice ' _updated_value %', _updated_value;

			query := format('SELECT ARRAY_AGG(packs_allocated) FROM %I', _temp_table_name);
			EXECUTE query INTO _packs;
			raise notice ' packs %', _packs;

			query := format('UPDATE %I SET packs_allocated_qty = $1 WHERE dc_code = $2 AND packs_allocated = ANY ($3)', _temp_table_name);
			debug_query := format('UPDATE %I SET packs_allocated_qty = %s WHERE dc_code = %L AND packs_allocated = ANY (%L::text[])', _temp_table_name, _updated_value, dc, _packs);
			raise notice ' query(template) %', query;
			raise notice ' query(params) packs_allocated_qty=%, dc_code=%, packs=%', _updated_value, dc, _packs;
			raise notice ' query(expanded) %', debug_query;
			EXECUTE query USING _updated_value, dc, _packs;
			raise notice ' update rowcount %', FOUND;
		END LOOP;
	END LOOP;
	query = FORMAT($$
				UPDATE inventory_smart.create_allocation_result_flat_gurobi carfs
					SET pack_dc_allocation = sub.pack_dc_allocation
					FROM (
						SELECT 
							carfs.allocation_code,
							carfs.article,
							carfs.store,
							JSONB_OBJECT_AGG(dc_data.dc_code, dc_data.dc_value) AS pack_dc_allocation
						FROM inventory_smart.create_allocation_result_flat_gurobi carfs
						JOIN (
							SELECT 
								store,
								article,
								dc_code,
								JSONB_BUILD_OBJECT(
								'packs_allocated', ARRAY_AGG(packs_allocated),
								'packs_allocated_qty', ARRAY_AGG(packs_allocated_qty),
								'packs_available_qty', ARRAY_AGG(packs_available_qty)
								) AS dc_value
							FROM (
								SELECT DISTINCT dc_code, store, article, packs_allocated, packs_allocated_qty, packs_available_qty
								FROM %3$s
							) AS raw_data
						GROUP BY store, article, dc_code
					) AS dc_data
					ON carfs.store = dc_data.store AND carfs.article = dc_data.article
					WHERE carfs.allocation_code = '%1$s'
					%2$s
					GROUP BY carfs.allocation_code, carfs.article, carfs.store
				) AS sub
				WHERE carfs.allocation_code = sub.allocation_code
				AND carfs.article = sub.article
				AND carfs.store = sub.store
				%2$s 
				$$,allocation_code, _pm_date_clause, _temp_table_name);
	raise notice ' first query%', query;
	execute query;
	raise notice '_updated_value %', _updated_value;
	query = FORMAT($$
		UPDATE inventory_smart.create_allocation_result_flat_gurobi carfs
		SET allocated_total =  CASE
								WHEN %4$s::int > 0 THEN flat.allocated_total
								ELSE 0
							  END,
			is_edited = (carfs.is_edited OR (carfs.allocated_total IS DISTINCT FROM flat.allocated_total))
		FROM (
			SELECT store, COALESCE(dpc.size, packs_allocated) size, SUM(packs_allocated_qty::int * COALESCE(dpc.units_in_pack, 1)) allocated_total
			FROM (select dc_code, store, packs_allocated,packs_available_qty, packs_allocated_qty from %1$s group by 1,2,3,4,5) flat
			LEFT JOIN inventory_smart.dc_pack_configuration dpc ON flat.packs_allocated = dpc.pack_type_id and dpc.article = '%2$s'
			GROUP BY store, size, packs_allocated
		) flat
		%3$s and carfs.retail_size_cd = flat.size
	$$, _temp_table_name, _article, where_clause, _updated_value);
	raise notice ' second query%', query;
	execute query;
         end
 $function$
;

