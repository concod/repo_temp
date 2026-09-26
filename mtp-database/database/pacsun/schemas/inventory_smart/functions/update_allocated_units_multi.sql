--liquibase formatted sql
--changeset Manohara.gulla:update_allocated_units_multi runOnChange:true stripComments:false splitStatements:false context:MTP-31687 labels:liquibase_project_start
--comment: change for MTP 31687 | MTP-90597 | bulk update changes | MTP-98042	
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_allocated_units_multi(character varying, character varying, character varying[], input jsonb, boolean);
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
	where_clause text; 
	dc text;
	size_value jsonb;
	_size text;
	allocated_value text;
	_units_allocated int;
	_other_article text;
	_temp_table_name text;
	_pm_date text;
	_query text;
	_pm_date_clause text;
begin
	_query = format($$SELECT date(created_at) FROM inventory_smart.plan_master WHERE plan_code = REPLACE(%L, 'edit_', '')$$, $1);
    execute _query into _pm_date;
    raise notice 'pm_date: %', _pm_date;
	_pm_date_clause = format($$ and carfs.created_at between $$ || quote_literal(_pm_date::timestamp) || $$ and $$ || quote_literal(_pm_date::timestamp + interval '1 day') || $$ $$, allocation_code, _article, store);
	where_clause = format($$ where allocation_code = '%s' and article = '%s' and store = any ('%s') $$, allocation_code, _article, store);

	_temp_table_name = format('flat_%s', REPLACE(_article, '-', ''));
	query = format($$
    CREATE TEMPORARY TABLE %1$s ON COMMIT DROP AS
      SELECT 
	  		dc_code,
			UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) packs_allocated,
			UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::text[]) packs_allocated_qty,
			UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_available_qty')::text, '[]', '{}'))::text[]) packs_available_qty,
			store,
			article
    	FROM (
        SELECT
          js.items AS dc_code,
          js.value AS inventory_data,
		  store,
          article
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
        %2$s %3$s
	      ) x
		  GROUP BY 1, 2, 3, 4, 5, 6 
     $$, _temp_table_name, where_clause, _pm_date_clause );
	raise notice ' zero query%', query;
	EXECUTE query;
	FOR dc, size_value IN SELECT * FROM jsonb_each_text(dc_size_value) WHERE value IS NOT NULL LOOP
		FOR _size, allocated_value IN SELECT * FROM jsonb_each_text(size_value) WHERE value IS NOT NULL LOOP

			query =  $$ UPDATE %s SET packs_allocated_qty = '%s' WHERE dc_code = '%s' AND packs_allocated = '%s' $$;
			EXECUTE format(query, _temp_table_name, allocated_value, dc, _size);
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
	query = FORMAT($$
		UPDATE inventory_smart.create_allocation_result_flat_gurobi carfs
		SET allocated_total = flat.allocated_total, is_edited= carfs.allocated_total != flat.allocated_total
		FROM (
			SELECT store, COALESCE(dpc.size, packs_allocated) size, SUM(packs_allocated_qty::int * COALESCE(dpc.units_in_pack, 1)) allocated_total
			FROM (select dc_code, store, packs_allocated,packs_available_qty, packs_allocated_qty from %1$s group by 1,2,3,4,5) flat
			LEFT JOIN inventory_smart.dc_pack_configuration dpc ON flat.packs_allocated = dpc.pack_type_id and dpc.article = '%2$s'
			GROUP BY store, size, packs_allocated
		) flat
		where carfs.retail_size_cd = flat.size  %3$s and allocation_code = '%4$s' and article = '%5$s' and carfs.store = flat.store
	$$, _temp_table_name, _article, _pm_date_clause, allocation_code, _article);
	raise notice ' second query%', query;
	execute query;
         end
 $function$
;
