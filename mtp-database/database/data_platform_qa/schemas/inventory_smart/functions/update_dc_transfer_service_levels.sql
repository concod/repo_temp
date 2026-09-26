--liquibase formatted sql
--changeset liquibase:update_dc_transfer_service_levels runOnChange:true stripComments:false splitStatements:false context:MTP-67597 labels:MTP-67597
--comment: SP to update DC transfer service levels table, added case to tackle null values.
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
BEGIN
    -- Debugging: print input values to understand the flow
    RAISE NOTICE 'Inputs: _is_all_records_selected=%, _excluded_rows=%, _product_attributes_filter=%, _constraint=%, _meta_filters=%, _updated_by=%, row_update=%',
        _is_all_records_selected, _excluded_rows, _product_attributes_filter, _constraint, _meta_filters, _updated_by, row_update;

	_where := inventory_smart.form_dc_dc_transfer_table_filters('dc_service_levels', _product_attributes_filter);
	raise notice '_where: %', _where;

    -- Condition 1: All records selected and no excluded rows
    IF _is_all_records_selected AND _excluded_rows = '[]'::JSONB  AND jsonb_array_length(_constraint) = 1 AND jsonb_array_length(row_update) = 0  THEN
        RAISE NOTICE 'Condition 1: All records selected, no excluded rows.';

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
              %s',
            (jsonb_array_elements(_constraint)->>'target_wos')::INTEGER,
            (jsonb_array_elements(_constraint)->>'min_stock')::INTEGER,
            (jsonb_array_elements(_constraint)->>'safety_stock_method'),
            (jsonb_array_elements(_constraint)->>'safety_stock_units')::INTEGER,
            (jsonb_array_elements(_constraint)->>'service_level_percentage')::NUMERIC,
            (jsonb_array_elements(_constraint)->>'safety_stock_wos')::NUMERIC,
            _updated_by,
            _where
        );

        RAISE NOTICE 'All records updated with constraints based on _where.';

    -- Condition 2: All records selected with excluded rows
    ELSIF _is_all_records_selected AND jsonb_array_length(_excluded_rows) > 0  AND jsonb_array_length(_constraint) = 1 AND jsonb_array_length(row_update) = 0 THEN
        RAISE NOTICE 'Condition 2: All records selected, some excluded rows present.';

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
              %s AND id NOT IN (SELECT jsonb_array_elements_text(%L)::INTEGER)',
            (jsonb_array_elements(_constraint)->>'target_wos')::INTEGER,
            (jsonb_array_elements(_constraint)->>'min_stock')::INTEGER,
            (jsonb_array_elements(_constraint)->>'safety_stock_method'),
            (jsonb_array_elements(_constraint)->>'safety_stock_units')::INTEGER,
            (jsonb_array_elements(_constraint)->>'service_level_percentage')::NUMERIC,
            (jsonb_array_elements(_constraint)->>'safety_stock_wos')::NUMERIC,
            _updated_by,
            _where,
            _excluded_rows
        );

        RAISE NOTICE 'Records updated with constraints excluding specified IDs based on _where.';

    -- Condition 3: Not all records selected, iterate over _constraint for specific updates
    ELSIF NOT _is_all_records_selected AND jsonb_array_length(_constraint) > 0 AND jsonb_array_length(row_update) = 0 THEN
        RAISE NOTICE 'Condition 3: Not all records selected, constraints specified.';

        FOR _item IN SELECT * FROM jsonb_array_elements(_constraint) LOOP
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
                (_item->>'target_wos')::INTEGER,
                (_item->>'min_stock')::INTEGER,
                (_item->>'safety_stock_method'),
                (_item->>'safety_stock_units')::INTEGER,
                (_item->>'service_level_percentage')::NUMERIC,
                (_item->>'safety_stock_wos')::NUMERIC,
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
		        -- Construct the SET clause dynamically within the FORMAT statement
		        EXECUTE FORMAT(
		            'UPDATE inventory_smart.dc_service_levels
		             SET %s updated_by = %s, updated_at = NOW()
		             WHERE id = %s',
		            -- Dynamically include fields only if they are non-null and non-empty
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
		                THEN FORMAT('safety_stock_wos = %s, ', (_constraint->0->>'safety_stock_wos')::NUMERIC) ELSE '' END,
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
