--liquibase formatted sql
--changeset liquibase:update_declared_variables runOnChange:true stripComments:false splitStatements:false context:insert_launch_delivery_fix_update labels:liquibase_project_start
--comment:  update declared variables
--rollback: SELECT 1

DROP FUNCTION  IF EXISTS assort_smart.insert_launch_delivery_records(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.insert_launch_delivery_records(data jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    item JSONB;
    delivery_item JSONB;
    current_launch_id VARCHAR;
    delivery_pen_value FLOAT;
    existing_parent_id VARCHAR;
    existing_child_id INTEGER;
BEGIN
    -- Begin transaction for data consistency
    BEGIN
        -- Loop through each launch and delivery item in the input
        FOR item IN SELECT * FROM jsonb_array_elements(data) LOOP
            -- Loop through each delivery to create separate parent records
            FOR delivery_item IN SELECT * FROM jsonb_array_elements(item->'deliveries') LOOP

                -- Check if parent record already exists
                SELECT launch_delivery_date_id INTO existing_parent_id
                FROM assort_smart.launch_delivery_date 
                WHERE season_code = (item->>'season_code')::integer
                  AND hierarchy_code = item->>'parent_hierarchy_code'
                  AND delivery = (delivery_item->>'delivery_id')::integer
                  AND launch = (item->>'launch')::integer
                  AND channel = (item->>'channel')::integer;

                IF existing_parent_id IS NULL THEN
                    -- Insert new parent record
                    INSERT INTO assort_smart.launch_delivery_date (
                        season_code,
                        channel,
                        launch,
                        delivery,
                        launch_start_date,
                        delivery_start_date,
                        hierarchy_code,
                        created_at
                    ) VALUES (
                        (item->>'season_code')::integer,
                        (item->>'channel')::integer,
                        (item->>'launch')::integer,
                        (delivery_item->>'delivery_id')::integer,
                        (item->>'launch_start_date')::date,
                        (delivery_item->>'delivery_start_date')::date,
                        item->>'parent_hierarchy_code',
                        now()
                    ) RETURNING launch_delivery_date_id INTO current_launch_id;
                ELSE
                    -- Update existing parent record
                    UPDATE assort_smart.launch_delivery_date 
                    SET 
                        channel = (item->>'channel')::integer,
                        launch = (item->>'launch')::integer,
                        launch_start_date = (item->>'launch_start_date')::date,
                        delivery_start_date = (delivery_item->>'delivery_start_date')::date
                    WHERE launch_delivery_date_id = existing_parent_id;

                    current_launch_id := existing_parent_id;
                END IF;

                -- Get delivery penetration value with default if not provided
                IF delivery_item->>'delivery_pen' IS NOT NULL THEN
                    delivery_pen_value := (delivery_item->>'delivery_pen')::float;
                ELSE
                    delivery_pen_value := 1.0;  -- Default value
                END IF;

                -- Check if child record already exists
                SELECT launch_delivery_hierarchy_date_id INTO existing_child_id
                FROM assort_smart.launch_delivery_hierarchy_date 
                WHERE launch_delivery_date_id = current_launch_id
                  AND hierarchy_code = item->>'hierarchy_code'
                  AND final_level = COALESCE(item->>'final_level', 'test');

                IF existing_child_id IS NULL THEN
                    -- Insert new hierarchy-specific record
                    INSERT INTO assort_smart.launch_delivery_hierarchy_date (
                        launch_delivery_date_id,
                        hierarchy_code,
                        launch_pen,
                        delivery_pen,
                        final_level,
                        is_active
                    ) VALUES (
                        current_launch_id,
                        item->>'hierarchy_code',
                        (item->>'launch_pen')::float,
                        delivery_pen_value,
                        COALESCE(item->>'final_level', 'test'),
                        TRUE
                    );
                ELSE
                    -- Update existing child record
                    UPDATE assort_smart.launch_delivery_hierarchy_date 
                    SET 
                        launch_pen = (item->>'launch_pen')::float,
                        delivery_pen = delivery_pen_value,
                        final_level = COALESCE(item->>'final_level', 'test'),
                        is_active = TRUE
                    WHERE launch_delivery_hierarchy_date_id = existing_child_id;
                END IF;

            END LOOP;
        END LOOP;

    -- Handle exceptions to ensure transaction consistency
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error inserting launch and delivery records: %', SQLERRM;
    END;
END;
$function$
; 