--liquibase formatted sql
--changeset suba.nataraj:update_allocated_units_multi runOnChange:true stripComments:false splitStatements:false context:MTP-31687 labels:liquibase_project_start
--comment: change for MTP 31687
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_allocated_units_multi(character varying, character varying, character varying, input jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.update_allocated_units_multi(character varying, character varying, character varying, input jsonb, boolean)
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
begin
	where_clause = format($$ WHERE allocation_code = '%s' and article = '%s' and store = '%s' $$, allocation_code, _article, store);
	_temp_table_name = format('flat_%s', REPLACE(_article, '-', ''));
	query = format($$
    CREATE TEMPORARY TABLE %2$s ON COMMIT DROP AS
      SELECT dc_code,
			       UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_allocated')::text, '[]', '{}'))::text[]) packs_allocated,
			       UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_allocated_qty')::text, '[]', '{}'))::text[]) packs_allocated_qty,
			       UNNEST((TRANSLATE((inventory_data::jsonb->>'packs_available_qty')::text, '[]', '{}'))::text[]) packs_available_qty
    	FROM (
        SELECT
          js.items AS dc_code,
          js.value AS inventory_data
        FROM inventory_smart.create_allocation_result_flat_gurobi carfs CROSS JOIN LATERAL jsonb_each_text(carfs.pack_dc_allocation) js(items, value)
        %1$s
	      GROUP BY 1, 2
      ) x $$, where_clause, _temp_table_name);
	EXECUTE query;
	FOR dc, size_value IN SELECT * FROM jsonb_each_text(dc_size_value) WHERE value IS NOT NULL LOOP
		FOR _size, allocated_value IN SELECT * FROM jsonb_each_text(size_value) WHERE value IS NOT NULL LOOP

			IF (base_call) THEN
				FOR _other_article IN SELECT DISTINCT article FROM inventory_smart.dc_pack_configuration WHERE pack_type_id = _size AND article != _article LOOP
					PERFORM inventory_smart.update_allocated_units_multi($1, _other_article, $3, JSONB_BUILD_OBJECT(dc, JSONB_BUILD_OBJECT(_size, allocated_value)), FALSE);
				END LOOP;
			END IF;
			query =  $$ UPDATE %s SET packs_allocated_qty = '%s' WHERE dc_code = '%s' AND packs_allocated = '%s' $$;
			EXECUTE format(query, _temp_table_name, allocated_value, dc, _size);
		END LOOP;
	END LOOP;
  query = FORMAT($$
		UPDATE inventory_smart.create_allocation_result_flat_gurobi
    SET pack_dc_allocation = (
      SELECT JSONB_OBJECT_AGG(dc_code, dc_value)
      FROM (
        SELECT dc_code,
               JSONB_OBJECT_AGG('packs_allocated', packs_allocated) ||
                JSONB_OBJECT_AGG('packs_allocated_qty', packs_allocated_qty) ||
                JSONB_OBJECT_AGG('packs_available_qty', packs_available_qty) dc_value
        FROM (
          SELECT dc_code, ARRAY_AGG(packs_allocated) packs_allocated, ARRAY_AGG(packs_allocated_qty) packs_allocated_qty, ARRAY_AGG(packs_available_qty) packs_available_qty
          FROM %s
          GROUP BY dc_code
        ) s
        GROUP BY dc_code
      ) s
    ) %s $$, _temp_table_name, where_clause) ;
	execute query;
	query = FORMAT($$
		UPDATE inventory_smart.create_allocation_result_flat_gurobi carfs
		SET allocated_total = flat.allocated_total, is_edited= carfs.allocated_total != flat.allocated_total
		FROM (
			SELECT COALESCE(dpc.size, packs_allocated) size, SUM(packs_allocated_qty::int * COALESCE(dpc.units_in_pack, 1)) allocated_total
			FROM %1$s flat
			LEFT JOIN inventory_smart.dc_pack_configuration dpc ON flat.packs_allocated = dpc.pack_type_id and dpc.article = '%2$s'
			GROUP BY 1
		) flat
		WHERE allocation_code = '%3$s' AND article = '%2$s' AND carfs.retail_size_cd = flat.size AND carfs.store = '%4$s'
	$$, _temp_table_name, _article, allocation_code, store);
	execute query;
         end
 $function$
;
