--liquibase formatted sql
--changeset chaitanyaprasad.reddy:oms_edit_orders_carters runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:oms_edit_orders_carters
--comment: Added SP for OMS edit orders
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.oms_edit_orders(jsonb, integer);
CREATE OR REPLACE FUNCTION inventory_smart.oms_edit_orders(jsonb, integer)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_date_rec jsonb;
    key_val record;
    _set_clause text;
    _query text;
       updated_ids int[] := '{}';  -- Initialize an empty text array to store ids
       v_id int;  -- Declare a variable to hold the id

begin
	raise notice '%', jsonb_array_length($1);
    -- Iterate over the JSON array in $1
    FOR v_date_rec IN SELECT * FROM jsonb_array_elements($1) 
    loop
	    raise notice 'entered %', v_date_rec;
        -- Initialize the dynamic SET clause
        _set_clause := '';
        v_id := (v_date_rec->>'id')::int;

        -- Loop through each key-value pair in the JSONB object
        FOR key_val IN SELECT * FROM jsonb_each(v_date_rec) 
        loop
	       
            -- Exclude the `id` field
            IF key_val.key != 'id' THEN
                -- Handle specific fields with explicit casting
                IF key_val.key = 'expected_receipt_date' or key_val.key = 'editable_expected_receipt_date' THEN
                    -- Handle as DATE type
                   _set_clause := _set_clause || key_val.key || ' = ' || 
                        'TO_DATE(''' || trim(BOTH '"' FROM key_val.value::text)  || ''', ''YYYY-MM-DD'')' || ', ';
                ELSIF key_val.key = 'order_quantity' THEN
                    -- Handle as INTEGER type
                    _set_clause := _set_clause || key_val.key || ' = ' || 
                        key_val.value::integer || ', ';
                ELSE
                    -- For other fields, handle as they come in the JSON
                    _set_clause := _set_clause || key_val.key || ' = ' || 
                        quote_literal(key_val.value) || ', ';
                END IF;
            END IF;
        END loop;

        -- Remove the trailing comma and space from the SET clause
        _set_clause := rtrim(_set_clause, ', ');

        -- Prepare the full dynamic query
        _query := 'UPDATE inventory_smart.oms_orders_recommended SET ' || 
                  _set_clause || 
                  ', order_gen_type = CASE WHEN order_gen_type != ''Manual'' THEN ''Edited'' ELSE order_gen_type END, ' ||
				 'updated_at = now(), updated_by = ' || $2 || 
                  ' WHERE id = ' || v_id;
        -- Execute the dynamic query
        EXECUTE _query;

        -- Collect the updated id into the updated_ids array
                updated_ids := array_append(updated_ids, v_id);

    END LOOP;

    -- Return the list of updated ids
    RETURN updated_ids;
END  $function$
;
