--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:match_with_ly runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for match_with_ly
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.match_with_ly(int4, int4, _int4, _text, _text);

CREATE OR REPLACE FUNCTION item_smart.match_with_ly(start_week integer, end_week integer, hierarchy_codes integer[], channel_names text[], kpi_values text[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$


--calling statement
--SELECT item_smart.match_with_ly(
   -- 202442,
   -- 202442,
  --  ARRAY[769656, 769660, 776976],
  --  ARRAY['Stores'], -- Channel Names array without curly braces
  --  ARRAY['written_sales_dollars', 'written_sales_units']
--);

DECLARE
    cur_hierarchy_code integer;
    cur_channel_name text;
    cur_kpi_value text;
    cur_kpi_value_value numeric; 
    rows_updated INT := 0;
    select_query TEXT;
    update_query TEXT;
BEGIN
    -- Fetch distinct hierarchy codes and KPI values from ly_master
    FOR cur_hierarchy_code IN
        select hierarchy_code
        FROM item_smart.ly_master
        WHERE hierarchy_code = ANY(hierarchy_codes)
            AND current_week BETWEEN start_week AND end_week
            AND channel = ANY(channel_names)
    LOOP
        -- Construct select query for debugging purposes
        select_query := 'SELECT ';
        FOREACH cur_kpi_value IN ARRAY kpi_values LOOP
            select_query := select_query || format('%I, ', cur_kpi_value);
        END LOOP;
        -- Remove the trailing comma and space from the select query
        select_query := left(select_query, length(select_query) - 2);
        -- Append the FROM and WHERE clauses to the select query
        select_query := select_query || format(' FROM item_smart.ly_master WHERE hierarchy_code = %s AND current_week BETWEEN %s AND %s AND channel::text IN (%s)', cur_hierarchy_code, start_week, end_week, array_to_string(ARRAY(SELECT quote_literal(channel_name) FROM unnest(channel_names) AS channel_name), ','));

        -- Print select query for debugging
        RAISE NOTICE 'Select Query: %', select_query;

        -- Construct update query for each hierarchy code and dynamic KPI values
        update_query := 'UPDATE item_smart.wp_master SET ';
        FOREACH cur_kpi_value IN ARRAY kpi_values LOOP
            -- Get the actual KPI value from tb_ly_master
            EXECUTE format('SELECT %I FROM item_smart.ly_master WHERE hierarchy_code = %s AND current_week BETWEEN %s AND %s AND channel::text IN (%s)', cur_kpi_value, cur_hierarchy_code, start_week, end_week, array_to_string(ARRAY(SELECT quote_literal(channel_name) FROM unnest(channel_names) AS channel_name), ','))
            INTO cur_kpi_value_value;

            -- Append SET clause for each KPI value
            update_query := update_query || format('%I = %s, ', cur_kpi_value, cur_kpi_value_value);
        END LOOP;
        -- Remove the trailing comma and space from the update query
        update_query := left(update_query, length(update_query) - 2);
        -- Append the WHERE clause to the update query
        update_query := update_query || format(' WHERE hierarchy_code = %s AND current_week BETWEEN %s AND %s AND channel::text IN (%s)', cur_hierarchy_code, start_week, end_week, array_to_string(ARRAY(SELECT quote_literal(channel_name) FROM unnest(channel_names) AS channel_name), ','));

        -- Print update query for debugging
        RAISE NOTICE 'Update Query: %', update_query;

        -- Update corresponding rows in tb_wp_master
        EXECUTE update_query;

        rows_updated := rows_updated + 1;
        RAISE NOTICE 'Updated hierarchy_code: %', cur_hierarchy_code;
    END LOOP;

    -- Return the count of rows updated
    RETURN rows_updated;
END;
$function$
;
