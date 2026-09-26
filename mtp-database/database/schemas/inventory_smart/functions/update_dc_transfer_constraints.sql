--liquibase formatted sql
--changeset liquibase:update_dc_transfer_constraints runOnChange:true stripComments:false splitStatements:false context:MTP-93869 labels:MTP-93869
--comment: SP to update DC transfer constraints table. Updated SP to handle meta filters
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_dc_transfer_constraints(bool, jsonb, jsonb, jsonb, jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.update_dc_transfer_constraints(_is_all_records_selected boolean, _excluded_rows jsonb, _product_attributes_filter jsonb, _constraint jsonb, _meta_filters jsonb, _updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE 
    _item JSONB;
    _where text;
	_query_combine text;
BEGIN

    -- Debugging: print input values to understand the flow
    RAISE NOTICE 'Inputs: _is_all_records_selected=%, _excluded_rows=%, _product_attributes_filter=%, _constraint=%, _meta_filters=%, _updated_by=%',
        _is_all_records_selected, _excluded_rows, _product_attributes_filter, _constraint, _meta_filters, _updated_by;

	IF _meta_filters ? 'search' THEN
	    _meta_filters := jsonb_set(
	        _meta_filters,
	        '{search}',
	        (
	            SELECT jsonb_agg(
	                CASE 
	                    WHEN item->>'column' IN ('source_dc', 'destination_dc')
	                    THEN jsonb_set(item, '{column}', '"dc1.linked_store_code"')
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
	            CASE 
	                WHEN key IN ('source_dc', 'destination_dc') THEN 'dc1.linked_store_code' 
	                ELSE key 
	            END,
	            value
	        )
	        FROM jsonb_each(_product_attributes_filter)
	    );
	END IF;

	_where := inventory_smart.form_dc_dc_transfer_table_filters('dc_transfer_constraints', _product_attributes_filter, _meta_filters);
	raise notice '_where: %', _where;

    -- Check if all records are selected and excluded rows are NULL or an empty list
    IF _is_all_records_selected AND (_excluded_rows IS NULL OR _excluded_rows = '[]'::JSONB) THEN
        RAISE NOTICE 'Condition 1: All records selected, no excluded rows.';
        -- Apply min_transfer_quantity to all records

		_query_combine := FORMAT(
		    'WITH cte AS (
		        SELECT c.id
		        FROM inventory_smart.dc_transfer_constraints c
		        JOIN global.distribution_centres dc1 ON c.source_dc = dc1.dc_code
		        JOIN global.distribution_centres dc2 ON c.destination_dc = dc2.dc_code
		        %s
		    )
		    UPDATE inventory_smart.dc_transfer_constraints AS dtc
		    SET min_transfer_quantity = %s,
		        updated_by = %s,
		        updated_at = NOW()
		    WHERE dtc.id IN (SELECT id FROM cte);',
		    _where,
		    (jsonb_array_elements(_constraint)->>'min_transfer_quantity')::bigint,
		    _updated_by
		);

		RAISE NOTICE '_query_combine: %', _query_combine;
		EXECUTE _query_combine;

	-- Check if all records are selected and excluded rows contain some IDs
    ELSIF _is_all_records_selected AND jsonb_array_length(_excluded_rows) > 0 THEN
        RAISE NOTICE 'Condition 2: All records selected, some excluded rows present.';
        -- Apply min_transfer_quantity to all records excluding specific IDs

		_query_combine := FORMAT(
		    'WITH cte AS (
		        SELECT c.id
		        FROM inventory_smart.dc_transfer_constraints c
		        JOIN global.distribution_centres dc1 ON c.source_dc = dc1.dc_code
		        JOIN global.distribution_centres dc2 ON c.destination_dc = dc2.dc_code
		        %s
		    )
		    UPDATE inventory_smart.dc_transfer_constraints AS dtc
		    SET min_transfer_quantity = %s,
		        updated_by = %s,
		        updated_at = NOW()
		    WHERE dtc.id IN (SELECT id FROM cte)
		      AND dtc.id NOT IN (SELECT jsonb_array_elements_text(%L)::INTEGER);',
		    _where,
		    (jsonb_array_elements(_constraint)->>'min_transfer_quantity')::bigint,
		    _updated_by,
		    _excluded_rows
		);

		RAISE NOTICE '_query_combine: %', _query_combine;
		EXECUTE _query_combine;

	-- Check if not all records are selected and _excluded_rows is NULL, but _constraint contains mappings
    ELSIF NOT _is_all_records_selected AND jsonb_array_length(_excluded_rows) = 0 AND jsonb_array_length(_constraint) > 0 THEN
        RAISE NOTICE 'Condition 3: Not all records selected, no excluded rows, constraints present.';
        -- Iterate over each object in _constraint to update specific IDs
        FOR _item IN SELECT * FROM jsonb_array_elements(_constraint) LOOP
            EXECUTE FORMAT(
                'UPDATE inventory_smart.dc_transfer_constraints 
                 SET min_transfer_quantity = %s, updated_by = %s, updated_at = NOW() 
                 WHERE id = %s',
                (_item->>'min_transfer_quantity')::bigint, _updated_by, (_item->>'id')::INTEGER
            );
            RAISE NOTICE 'Updated record with id: %, min_transfer_quantity: %', (_item->>'id')::INTEGER, (_item->>'min_transfer_quantity')::bigint;
        END LOOP;

        RAISE NOTICE 'Records updated with specific min_transfer_quantity values based on _constraint.';

    END IF;
END;
$function$
;
