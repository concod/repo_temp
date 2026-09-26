--liquibase formatted sql
--changeset liquibase:update_dc_transfer_service_levels runOnChange:true stripComments:false splitStatements:false context:MTP-93869 labels:MTP-93869
--comment: Updated SP form_dc_dc_transfer_table_filters to support meta_filters for dynamic WHERE clause generation and updated SP update_dc_transfer_service_levels to reuse dynamic SET clause with CASE statements across Conditions 1, 2, and 4 for consistent handling of non-null and non-empty constraint fields. Updated SP to take care the filter cols present into join tables.
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_dc_transfer_service_levels(bool, jsonb, jsonb, jsonb, jsonb, jsonb, int4);

CREATE OR REPLACE FUNCTION inventory_smart.update_dc_transfer_service_levels(_is_all_records_selected boolean, _excluded_rows jsonb, row_update jsonb, _product_attributes_filter jsonb, _constraint jsonb, _meta_filters jsonb, _updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE 
    _item JSONB;
    _id INTEGER;
	_where text;
	_set_clause text;
	_query_test text;
	_query_combine text;

BEGIN

    RAISE NOTICE 'Inputs: _is_all_records_selected=%, _excluded_rows=%, _product_attributes_filter=%, _constraint=%, _meta_filters=%, _updated_by=%, row_update=%',
        _is_all_records_selected, _excluded_rows, _product_attributes_filter, _constraint, _meta_filters, _updated_by, row_update;

    IF _meta_filters ? 'search' THEN
        _meta_filters := jsonb_set(
            _meta_filters,
            '{search}',
            (
                SELECT jsonb_agg(
                    CASE 
                        WHEN item->>'column' = 'dc' 
                        THEN jsonb_set(item, '{column}', '"linked_store_code"')
                        ELSE item
                    END
                )
                FROM jsonb_array_elements(_meta_filters->'search') AS item
            )
        );
    END IF;

    -- Replace "dc" with "linked_store_code" in product attributes
    IF jsonb_typeof(_product_attributes_filter) = 'object' THEN
        _product_attributes_filter := (
            SELECT jsonb_object_agg(
                CASE WHEN key = 'dc' THEN 'linked_store_code' ELSE key END,
                value
            )
            FROM jsonb_each(_product_attributes_filter)
        );
    END IF;

	_where := inventory_smart.form_dc_dc_transfer_table_filters('dc_service_levels', _product_attributes_filter, _meta_filters);
	raise notice '_where: %', _where;


	-- Construct SET clause dynamically
    _set_clause := 
        CASE 
            WHEN (_constraint->0->>'target_wos') IS NOT NULL AND (_constraint->0->>'target_wos') != '' 
            THEN FORMAT('target_wos = %s, ', (_constraint->0->>'target_wos')::INTEGER) ELSE '' END ||
        CASE 
            WHEN (_constraint->0->>'min_stock') IS NOT NULL AND (_constraint->0->>'min_stock') != '' 
            THEN FORMAT('min_stock = %s, ', (_constraint->0->>'min_stock')::INTEGER) ELSE '' END ||
        CASE 
            WHEN (_constraint->0->>'safety_stock_method') IS NOT NULL AND (_constraint->0->>'safety_stock_method') != '' 
            THEN FORMAT('safety_stock_method = %L, ', (_constraint->0->>'safety_stock_method')) ELSE '' END ||
        CASE 
            WHEN (_constraint->0->>'safety_stock_units') IS NOT NULL AND (_constraint->0->>'safety_stock_units') != '' 
            THEN FORMAT('safety_stock_units = %s, ', (_constraint->0->>'safety_stock_units')::INTEGER) ELSE '' END ||
        CASE 
            WHEN (_constraint->0->>'service_level_percentage') IS NOT NULL AND (_constraint->0->>'service_level_percentage') != '' 
            THEN FORMAT('service_level_percentage = %s, ', (_constraint->0->>'service_level_percentage')::NUMERIC) ELSE '' END ||
        CASE 
            WHEN (_constraint->0->>'safety_stock_wos') IS NOT NULL AND (_constraint->0->>'safety_stock_wos') != '' 
            THEN FORMAT('safety_stock_wos = %s, ', (_constraint->0->>'safety_stock_wos')::NUMERIC) ELSE '' END;



    -- Condition 1: All records selected and no excluded rows
    IF _is_all_records_selected AND _excluded_rows = '[]'::JSONB  AND jsonb_array_length(_constraint) = 1 THEN
        RAISE NOTICE 'Condition 1: All records selected, no excluded rows.';

			_query_combine := FORMAT(
			    'WITH cte AS (
			        SELECT c.id
			        FROM inventory_smart.dc_service_levels c
			        JOIN global.distribution_centres dc ON c.dc = dc.dc_code
			        %s
			    )
			    UPDATE inventory_smart.dc_service_levels AS dsl
			    SET %s updated_by = %s, updated_at = NOW()
			    WHERE dsl.id IN (SELECT id FROM cte);',
			    _where,
			    _set_clause,
			    _updated_by
			);

			RAISE NOTICE '_query_combine: %', _query_combine;
			EXECUTE _query_combine;

    -- Condition 2: All records selected with excluded rows
    ELSIF _is_all_records_selected AND jsonb_array_length(_excluded_rows) > 0  AND jsonb_array_length(_constraint) = 1 THEN
        RAISE NOTICE 'Condition 2: All records selected, some excluded rows present.';

			_query_combine := FORMAT(
			    'WITH cte AS (
			        SELECT c.id
			        FROM inventory_smart.dc_service_levels c
			        JOIN global.distribution_centres dc ON c.dc = dc.dc_code
			        %s
			    )
			    UPDATE inventory_smart.dc_service_levels AS dsl
			    SET %s updated_by = %s, updated_at = NOW()
			    WHERE dsl.id IN (SELECT id FROM cte)
			      AND dsl.id NOT IN (SELECT jsonb_array_elements_text(%L)::INTEGER);',
			    _where,
			    _set_clause,
			    _updated_by,
			    _excluded_rows
			);

			RAISE NOTICE '_query_combine: %', _query_combine;
			EXECUTE _query_combine;

    -- Condition 3: Not all records selected, iterate over _constraint for specific updates
    ELSIF NOT _is_all_records_selected AND jsonb_array_length(_constraint) > 0 AND jsonb_array_length(row_update) = 0 THEN
        RAISE NOTICE 'Condition 3: Not all records selected, constraints specified.';

        FOR _item IN SELECT * FROM jsonb_array_elements(_constraint) LOOP
			RAISE NOTICE '_ITEM: %', _item;

            EXECUTE FORMAT(
                'UPDATE inventory_smart.dc_service_levels
                 SET target_wos = %s,
                     min_stock = %s,
                     safety_stock_method = %L,
                     safety_stock_units = %s,
                     service_level_percentage = %s,
                     safety_stock_wos = %s,
                     updated_by = %s,
                     updated_at = NOW()
                 WHERE id = %s',
                quote_nullable((_item->>'target_wos')::INTEGER),
                quote_nullable((_item->>'min_stock')::INTEGER),
                (_item->>'safety_stock_method'),
                quote_nullable((_item->>'safety_stock_units')::INTEGER),
                quote_nullable((_item->>'service_level_percentage')::NUMERIC),
                quote_nullable((_item->>'safety_stock_wos')::NUMERIC),
                _updated_by,
                (_item->>'id')::INTEGER
            );

            RAISE NOTICE 'Updated record with id: %, constraints: %', (_item->>'id')::INTEGER, _item;
        END LOOP;

        RAISE NOTICE 'Specific records updated based on _constraint.';

    -- Condition 4: Partial update logic
    ELSE
        RAISE NOTICE 'Condition 4: Checking for row_update variable.';

        IF NOT _is_all_records_selected AND _excluded_rows = '[]'::JSONB AND jsonb_array_length(_constraint) = 1 AND jsonb_array_length(row_update) >= 1 THEN
            RAISE NOTICE 'Condition 4: Updating specific rows based on row_update and single _constraint.';

			FOR _id IN SELECT jsonb_array_elements_text(row_update)::INTEGER LOOP
                EXECUTE FORMAT(
                    'UPDATE inventory_smart.dc_service_levels
                     SET %s updated_by = %s, updated_at = NOW()
                     WHERE id = %s',
                    _set_clause,
                    _updated_by,
                    _id
                );

                RAISE NOTICE 'Updated record with id: %, using constraints: %', _id, _constraint->0;
            END LOOP;
        END IF;

    END IF;
END;
$function$
;