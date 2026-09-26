--liquibase formatted sql
--changeset raja.duraisamy:Added_style_order_summary_test_update5 runOnChange:true stripComments:false splitStatements:false context:MTP-52730 labels:style_order_summary_test_update3-a
--comment: Created style_order_summary_test_update5 SP
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.oms_update_style_order_summary_order_quantity(jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.oms_update_style_order_summary_order_quantity(modifications jsonb, user_id text)
 RETURNS TABLE(updated_ids bigint)
 LANGUAGE plpgsql
AS $function$
DECLARE
    fiscal_period RECORD;
    style_group RECORD;
    updated_id bigint;
    temp_updated_ids bigint[] := '{}'; -- Temporary array to collect updated IDs
    total_quantity FLOAT; -- To calculate the total constrained ROQ
    row_count INT; -- Number of rows to distribute quantity across
    equal_quantity FLOAT; -- Quantity to equally distribute
BEGIN
    -- Iterate through fiscal periods
    FOR fiscal_period IN 
        SELECT * FROM jsonb_to_recordset(modifications) AS (
            fiscal_timeperiod_ids text[], -- Corrected field name to match input JSON
            modified jsonb,
            filter_type text -- Either 'week' or 'month'
        )
    LOOP
        RAISE NOTICE 'Processing fiscal periods: % with filter type: %', fiscal_period.fiscal_timeperiod_ids, fiscal_period.filter_type;

        -- Iterate through styles in the current fiscal period
        FOR style_group IN 
            SELECT * FROM jsonb_to_recordset(fiscal_period.modified) AS (
                ordergroup jsonb
            )
        LOOP

            -- Check if the ratio is "Infinity"
            IF style_group.ordergroup->>'ratio' = 'Infinity' OR style_group.ordergroup->>'ratio' = 'NaN' THEN
                -- Calculate the row count
                SELECT 
                    COUNT(*) INTO row_count
                FROM 
                    inventory_smart.oms_orders_recommended
                WHERE 
                    ((fiscal_period.filter_type = 'week' AND fiscal_year_week = ANY(fiscal_period.fiscal_timeperiod_ids::int[]))
                     OR (fiscal_period.filter_type = 'month' 
                         AND upper(month::text) = ANY(ARRAY(SELECT upper(unnest(fiscal_period.fiscal_timeperiod_ids))))))
                    AND order_group_id = (style_group.ordergroup->>'name')
                    AND order_status_id = 0;

                -- Calculate the equal quantity to distribute
                IF row_count > 0 THEN
                    equal_quantity := (style_group.ordergroup->>'value')::int / row_count;
                ELSE
                    equal_quantity := 0;
                END IF;

                -- Update order_quantity equally across all matching rows
                FOR updated_id IN
                    UPDATE inventory_smart.oms_orders_recommended
                    SET order_quantity = equal_quantity, 
                        updated_at = now(), 
                        updated_by = user_id::int,
                        order_gen_type = 'Edited'
                    WHERE 
                        ((fiscal_period.filter_type = 'week' AND fiscal_year_week = ANY(fiscal_period.fiscal_timeperiod_ids::int[]))
                         OR (fiscal_period.filter_type = 'month' 
                             AND upper(month::text) = ANY(ARRAY(SELECT upper(unnest(fiscal_period.fiscal_timeperiod_ids))))))
                        AND order_group_id = (style_group.ordergroup->>'name')
                        AND order_status_id = 0
                    RETURNING id
                LOOP
                    -- Add each updated ID to the temporary array
                    temp_updated_ids := array_append(temp_updated_ids, updated_id);
                    RAISE NOTICE 'Equally Distributed Updated ID: %', updated_id;
                END LOOP;

            ELSE
                -- Update order_quantity for the style level (ordergroup) based on the ratio
                FOR updated_id IN
                    UPDATE inventory_smart.oms_orders_recommended
                    SET order_quantity = roq_unconstrained::float * (style_group.ordergroup->>'ratio')::float, 
                        updated_at = now(), 
                        updated_by = user_id::int,
                        order_gen_type = 'Edited'
                    WHERE 
                        ((fiscal_period.filter_type = 'week' AND fiscal_year_week = ANY(fiscal_period.fiscal_timeperiod_ids::int[]))
                         OR (fiscal_period.filter_type = 'month' 
                             AND upper(month::text) = ANY(ARRAY(SELECT upper(unnest(fiscal_period.fiscal_timeperiod_ids))))))
                        AND order_group_id = (style_group.ordergroup->>'name')
                        AND order_status_id = 0
                    RETURNING id
                LOOP
                    -- Add each updated ID to the temporary array
                    temp_updated_ids := array_append(temp_updated_ids, updated_id);
                    RAISE NOTICE 'Updated ID: %', updated_id;
                END LOOP;

            END IF;  -- **Fix: Properly close the IF statement**

        END LOOP; -- End loop for style_group
    END LOOP; -- End loop for fiscal_period

    -- Return all collected updated IDs
    RETURN QUERY 
    SELECT unnest(temp_updated_ids); -- Unnest the array to return as a table
END;
$function$
;
