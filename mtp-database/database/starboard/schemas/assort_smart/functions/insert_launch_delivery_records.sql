--liquibase formatted sql
--changeset liquibase:revert-hierarchy-changes runOnChange:true stripComments:false splitStatements:false context:fix_column_order_and_display_name_mapping labels:liquibase_project_start
--comment: revert hierarchy changes
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
    BEGIN
        FOR item IN SELECT * FROM jsonb_array_elements(data) LOOP
            RAISE NOTICE 'Processing item: season_code=%, hierarchy_code=%, channel=%, launch=%',
                item->>'season_code', item->>'hierarchy_code', item->>'channel', item->>'launch';

            FOR delivery_item IN SELECT * FROM jsonb_array_elements(item->'deliveries') LOOP
                RAISE NOTICE 'Processing delivery: delivery_id=%, delivery_start_date=%',
                    delivery_item->>'delivery_id', delivery_item->>'delivery_start_date';

                -- Reset variables to avoid stale values from previous iteration
                existing_parent_id := NULL;
                existing_child_id := NULL;

                SELECT launch_delivery_date_id INTO existing_parent_id
                FROM assort_smart.launch_delivery_date 
                WHERE season_code = (item->>'season_code')::integer
                  AND hierarchy_code = item->>'parent_hierarchy_code'
                  AND delivery = (delivery_item->>'delivery_id')::integer
                  AND launch = (item->>'launch')::integer
                  AND channel = (item->>'channel')::integer;

                RAISE NOTICE 'existing_parent_id: %', existing_parent_id;

                IF existing_parent_id IS NULL THEN
                    INSERT INTO assort_smart.launch_delivery_date (
                        season_code,
                        channel,
                        launch,
                        delivery,
                        launch_start_date,
                        delivery_start_date,
                        hierarchy_code,
                        launch_display_name,
                        delivery_display_name,
                        created_at,
                        is_tool_generated
                    ) VALUES (
                        (item->>'season_code')::integer,
                        (item->>'channel')::integer,
                        (item->>'launch')::integer,
                        (delivery_item->>'delivery_id')::integer,
                        (item->>'launch_start_date')::date,
                        (delivery_item->>'delivery_start_date')::date,
                        item->>'parent_hierarchy_code',
                        (item->>'launch_display_name')::text,
                        (delivery_item->>'delivery_display_name')::text,
                        now(),
                        TRUE
                    ) RETURNING launch_delivery_date_id INTO current_launch_id;

                    RAISE NOTICE 'Inserted parent record with launch_delivery_date_id: %', current_launch_id;
                ELSE
                    UPDATE assort_smart.launch_delivery_date 
                    SET 
                        channel = (item->>'channel')::integer,
                        launch = (item->>'launch')::integer,
                        launch_start_date = (item->>'launch_start_date')::date,
                        delivery_start_date = (delivery_item->>'delivery_start_date')::date
                    WHERE launch_delivery_date_id = existing_parent_id;

                    current_launch_id := existing_parent_id;
                    RAISE NOTICE 'Updated existing parent record with launch_delivery_date_id: %', current_launch_id;
                END IF;

                IF delivery_item->>'delivery_pen' IS NOT NULL THEN
                    delivery_pen_value := (delivery_item->>'delivery_pen')::float;
                ELSE
                    delivery_pen_value := 1.0;
                END IF;

                SELECT launch_delivery_hierarchy_date_id INTO existing_child_id
                FROM assort_smart.launch_delivery_hierarchy_date 
                WHERE launch_delivery_date_id = current_launch_id
                  AND hierarchy_code = item->>'hierarchy_code'
                  AND final_level = COALESCE(item->>'final_level', 'test');

                RAISE NOTICE 'existing_child_id: %', existing_child_id;

                IF existing_child_id IS NULL THEN
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
                    RAISE NOTICE 'Inserted child record for hierarchy_code: %, final_level: %', item->>'hierarchy_code', item->>'final_level';
                ELSE
                    UPDATE assort_smart.launch_delivery_hierarchy_date 
                    SET 
                        launch_pen = (item->>'launch_pen')::float,
                        delivery_pen = delivery_pen_value,
                        final_level = COALESCE(item->>'final_level', 'test'),
                        is_active = TRUE
                    WHERE launch_delivery_hierarchy_date_id = existing_child_id;
                    RAISE NOTICE 'Updated existing child record with launch_delivery_hierarchy_date_id: %', existing_child_id;
                END IF;

            END LOOP;
        END LOOP;

    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Error inserting launch and delivery records: %', SQLERRM;
    END;
END;
$function$;