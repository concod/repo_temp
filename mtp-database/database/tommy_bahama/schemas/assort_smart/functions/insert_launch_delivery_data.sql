--liquibase formatted sql
--changeset liquibase:insert_launch_delivery_data runOnChange:true stripComments:false splitStatements:false context:insert_launch_delivery_data labels:liquibase_project_start
--comment:  insert_launch_delivery_data
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.insert_launch_delivery_data(json);

CREATE OR REPLACE FUNCTION assort_smart.insert_launch_delivery_data(p_data json)
 RETURNS TABLE(launch_delivery_date_id integer, hierarchy_records integer)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_item JSON;
    v_delivery JSON;
    v_launch_delivery_date_id INTEGER;
    v_hierarchy_records INTEGER := 0;
    v_result RECORD;
    v_hierarchy_date_records JSON := '[]'::JSON;
    v_delivery_id INTEGER;
    v_delivery_pen NUMERIC;
    v_delivery_key TEXT;
BEGIN
    -- Begin transaction
    BEGIN
        -- Iterate through each item in the JSON array
        FOR v_item IN SELECT * FROM json_array_elements(p_data)
        LOOP
            -- Insert into parent table (launch_delivery_date)
            INSERT INTO assort_smart.launch_delivery_date (
                season_code,
                channel,
                launch,
                delivery,
                launch_start_date,
                delivery_start_date,
                created_at
            )
            VALUES (
                (v_item->>'season_code')::INTEGER,
                (v_item->>'channel')::INTEGER,
                (v_item->>'launch')::INTEGER,
                (v_item->'deliveries'->0->>'delivery_id')::INTEGER, -- Primary delivery
                to_timestamp((v_item->>'launch_start_date')::BIGINT / 1000)::DATE,
                to_timestamp((v_item->'deliveries'->0->>'delivery_start_date')::BIGINT / 1000)::DATE,
                NOW()
            )
            RETURNING launch_delivery_date_id INTO v_launch_delivery_date_id;
            
            -- Reset hierarchy records counter for this parent record
            v_hierarchy_records := 0;
            
            -- Iterate through deliveries for this item
            FOR v_delivery IN SELECT * FROM json_array_elements(v_item->'deliveries')
            LOOP
                v_delivery_id := (v_delivery->>'delivery_id')::INTEGER;
                
                -- Dynamically access the delivery penetration value
                v_delivery_key := 'delivery' || v_delivery_id;
                
                -- Check if the specific delivery key exists, otherwise use default
                IF v_delivery ? v_delivery_key THEN
                    v_delivery_pen := (v_delivery->>v_delivery_key)::NUMERIC;
                ELSE
                    v_delivery_pen := COALESCE((v_delivery->>'delivery_pen')::NUMERIC, 1.0);
                END IF;
                
                -- Insert into child table (launch_delivery_hierarchy_date)
                INSERT INTO assort_smart.launch_delivery_hierarchy_date (
                    launch_delivery_date_id,
                    hierarchy_code,
                    launch_pen,
                    delivery_pen,
                    is_active
                )
                VALUES (
                    v_launch_delivery_date_id,
                    v_item->>'hierarchy_code',
                    COALESCE((v_item->>'launch_pen')::NUMERIC, 1.0),
                    v_delivery_pen,
                    TRUE
                );
                
                v_hierarchy_records := v_hierarchy_records + 1;
            END LOOP;
            
            -- Add to result set
            RETURN QUERY SELECT v_launch_delivery_date_id, v_hierarchy_records;
        END LOOP;
        
        -- If we get here, commit the transaction (implicit in function)
        EXCEPTION
            WHEN OTHERS THEN
                -- In case of any error, rollback the entire transaction
                RAISE EXCEPTION 'Error inserting launch and delivery data: %', SQLERRM;
    END;
END;
$function$
;
