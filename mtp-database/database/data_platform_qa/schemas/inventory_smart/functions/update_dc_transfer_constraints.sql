--liquibase formatted sql
--changeset liquibase:update_dc_transfer_constraints runOnChange:true stripComments:false splitStatements:false context:MTP-67597 labels:MTP-67597
--comment: SP to update DC transfer constraints table
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.update_dc_transfer_constraints(bool, jsonb, jsonb, jsonb, jsonb, int4);
CREATE OR REPLACE FUNCTION inventory_smart.update_dc_transfer_constraints(_is_all_records_selected boolean, _excluded_rows jsonb, _product_attributes_filter jsonb, _constraint jsonb, _meta_filters jsonb, _updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE 
    _item JSONB;
    _where text;
BEGIN

    -- Debugging: print input values to understand the flow
    RAISE NOTICE 'Inputs: _is_all_records_selected=%, _excluded_rows=%, _product_attributes_filter=%, _constraint=%, _meta_filters=%, _updated_by=%',
        _is_all_records_selected, _excluded_rows, _product_attributes_filter, _constraint, _meta_filters, _updated_by;

    _where := inventory_smart.form_dc_dc_transfer_table_filters('dc_service_levels', _product_attributes_filter);
    RAISE NOTICE '_where: %', _where;

    -- Check if all records are selected and excluded rows are NULL or an empty list
    IF _is_all_records_selected AND (_excluded_rows IS NULL OR _excluded_rows = '[]'::JSONB) THEN
        RAISE NOTICE 'Condition 1: All records selected, no excluded rows.';
        -- Apply min_transfer_quantity to all records
        EXECUTE FORMAT(
            'UPDATE inventory_smart.dc_transfer_constraints 
             SET min_transfer_quantity = %s, updated_by = %s, updated_at = NOW() 
             %s',
            (jsonb_array_elements(_constraint)->>'min_transfer_quantity')::bigint, _updated_by, _where
        );

        RAISE NOTICE 'All records updated with min_transfer_quantity.';
    

	-- Check if all records are selected and excluded rows contain some IDs
    ELSIF _is_all_records_selected AND jsonb_array_length(_excluded_rows) > 0 THEN
        RAISE NOTICE 'Condition 2: All records selected, some excluded rows present.';
        -- Apply min_transfer_quantity to all records excluding specific IDs
        EXECUTE FORMAT(
            'UPDATE inventory_smart.dc_transfer_constraints 
             SET min_transfer_quantity = %s, updated_by = %s, updated_at = NOW() 
             %s AND id NOT IN (SELECT jsonb_array_elements_text(%L)::INTEGER)',
            (jsonb_array_elements(_constraint)->>'min_transfer_quantity')::bigint, _updated_by, _where, _excluded_rows
        );

        RAISE NOTICE 'Records updated with min_transfer_quantity excluding IDs.';


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