--liquibase formatted sql
--changeset kailash.kangne:Added_oms_update_shipment_constraints_update5 runOnChange:true stripComments:false splitStatements:false context:MTP-101298  labels:oms_update_shipment_constraints_update
--comment: MTP-101298 

DROP FUNCTION IF EXISTS inventory_smart.oms_update_shipment_constraints(_product_filters jsonb, _selections jsonb, _values jsonb, _updated_by integer);

CREATE OR REPLACE FUNCTION inventory_smart.oms_update_shipment_constraints(_product_filters jsonb, _selections jsonb, _values jsonb, _updated_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _shipment_id int;
    _min_replenishment_quantity int := NULL;
    _max_replenishment_quantity int := NULL;
    _order_multiple int := NULL;
    _values_object jsonb;
    _pa_query text := '';
    _update_cols text := 'min_replenishment_quantity, max_replenishment_quantity, order_multiple';
    _update_count int;

BEGIN

    _pa_query := global.form_main_table_filters('product_attributes_filter', _product_filters);

    -- Validate that _selections are provided
    IF jsonb_array_length(_selections) = 0 THEN
        -- Extract values from the first element in _values
        IF jsonb_array_length(_values) > 0 THEN
            IF _values->0 ? 'min_replenishment_quantity' THEN
                _min_replenishment_quantity := (_values->0->>'min_replenishment_quantity')::int;
            END IF;
            
            IF _values->0 ? 'max_replenishment_quantity' THEN
                _max_replenishment_quantity := (_values->0->>'max_replenishment_quantity')::int;
            END IF;
            
            IF _values->0 ? 'order_multiple' THEN
                _order_multiple := (_values->0->>'order_multiple')::int;
            END IF;

        END IF;

        -- Update all records based on product filter without a temp table
        -- Using a direct UPDATE with a subquery
        EXECUTE 
                'WITH filtered_products AS (
                    SELECT distinct l4_name as product_code
                    FROM global.product_attributes_filter paf ' || _pa_query || '
                 )
                 UPDATE inventory_smart.oms_constraints_shipment cs
                 SET min_replenishment_quantity = COALESCE($1, cs.min_replenishment_quantity),
                    max_replenishment_quantity = COALESCE($2, cs.max_replenishment_quantity),
                    order_multiple = COALESCE($3, cs.order_multiple),
                    updated_by = $4,
                    updated_at = NOW(),
                    column_updated = $5
                 FROM filtered_products fp
                 WHERE cs.product_code = fp.product_code'
        USING 
            _min_replenishment_quantity,
            _max_replenishment_quantity,
            _order_multiple,
            _updated_by,
            _update_cols;
            
        GET DIAGNOSTICS _update_count = ROW_COUNT;
        RAISE NOTICE 'Updated % records based on product filter', _update_count;
    
    ELSE
        -- Iterate over each shipment_id in _selections
        FOR i IN 0..jsonb_array_length(_selections)-1 LOOP
            IF NOT (_selections->i ? 'id') THEN
                RAISE EXCEPTION 'Missing shipment_id in _selections at index %', i;
            END IF;

            -- Extract the shipment_id from _selections
            _shipment_id := (_selections->i->>'id')::int;

            -- Find the corresponding _values object for the current _shipment_id
            _values_object := NULL;
            FOR j IN 0..jsonb_array_length(_values)-1 LOOP
                IF (_values->j->>'id')::int = _shipment_id THEN
                    _values_object := _values->j;
                    EXIT;
                END IF;
            END LOOP;

            -- If no matching _values object found for the shipment_id, skip this iteration
            IF _values_object IS NULL THEN
                RAISE NOTICE 'No matching attribute values found for shipment_id %', _shipment_id;
                CONTINUE;
            END IF;

            -- Extract the attribute values from the corresponding _values object
            IF _values_object ? 'min_replenishment_quantity' THEN
                _min_replenishment_quantity := (_values_object->>'min_replenishment_quantity')::int;
            ELSE
                _min_replenishment_quantity := NULL;
            END IF;
            
            IF _values_object ? 'max_replenishment_quantity' THEN
                _max_replenishment_quantity := (_values_object->>'max_replenishment_quantity')::int;
            ELSE
                _max_replenishment_quantity := NULL;
            END IF;
            
            IF _values_object ? 'order_multiple' THEN
                _order_multiple := (_values_object->>'order_multiple')::int;
            ELSE
                _order_multiple := NULL;
            END IF;


            -- Update the matching row based on shipment_id
            UPDATE inventory_smart.oms_constraints_shipment
            SET min_replenishment_quantity = COALESCE(_min_replenishment_quantity, min_replenishment_quantity),
                max_replenishment_quantity = COALESCE(_max_replenishment_quantity, max_replenishment_quantity),
                order_multiple = COALESCE(_order_multiple, order_multiple),
                updated_by = _updated_by,
                updated_at = NOW(),
                column_updated = 'min_replenishment_quantity, max_replenishment_quantity, order_multiple'
            WHERE id = _shipment_id;

            -- Check if the update affected any rows
            IF NOT FOUND THEN
                RAISE NOTICE 'No rows updated for shipment_id %', _shipment_id;
            END IF;
        END LOOP;
    END IF;

END;
$function$
;