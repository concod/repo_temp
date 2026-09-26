--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:sync_return_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sync_return_v3 
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sync_return_inv_v3(date, date, jsonb, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.sync_return_inv_v3(sdate date, edate date, filters jsonb, dept text, planing_level text, hierarchy_code_list integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sql            TEXT;
    wp_table_name    TEXT;
    v_affected_rows  INTEGER;
    where_clause     TEXT := ''; -- Initialize the WHERE clause
    filter           JSONB;
    attribute_name   TEXT;
    values           TEXT;
    operator         TEXT;
    is_special_order_condition TEXT := '';

BEGIN
    -- Set the working table name based on department
    wp_table_name := 'item_smart.wp_master_' || dept;

    -- Build the WHERE clause dynamically from the filters
    FOR filter IN 
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (
            SELECT string_agg(quote_literal(value), ', ')
            FROM jsonb_array_elements_text(filter->'value') value
        );
        operator := filter->>'operator';
        
        -- Check if attribute_name is 'l3_name' and handle special order conditions
        IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
            IF values LIKE '%REGULAR_%' THEN
                is_special_order_condition := 'is_special_order = false';
                values := (
                    SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                    FROM jsonb_array_elements_text(filter->'value') value
                );
            ELSIF values LIKE '%SPO_%' THEN
                is_special_order_condition := 'is_special_order = true';
                values := (
                    SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                    FROM jsonb_array_elements_text(filter->'value') value
                );
            END IF;
        END IF;

        -- Skip certain attributes
        IF attribute_name NOT IN ('fiscal_month_name_abb', 'fiscal_quarter_name_abb', 'fiscal_year', 'fiscal_week') THEN
            -- Handle the 'in' operator
            IF operator = 'in' THEN
                IF where_clause = '' THEN
                    where_clause := format('%I %s (%s)', attribute_name, operator, values);
                ELSE
                    where_clause := where_clause || format(' AND %I %s (%s)', attribute_name, operator, values);
                END IF;
            ELSE
                RAISE NOTICE 'Unsupported operator: %', operator;
            END IF;
        END IF;
    END LOOP;

    -- Append the is_special_order condition if applicable
    IF is_special_order_condition <> '' THEN
        where_clause := where_clause || ' AND ' || is_special_order_condition;
    END IF;

    RAISE NOTICE 'WHERE Clause: %', where_clause;

    -- Construct the full SQL query
    v_sql := format('
    WITH month_bounds AS (
        SELECT  
            wp.hierarchy_code, 
            channel, 
            current_week,
            COALESCE(
            LAG(return_units * (1 - damage_rate_perc), 4) 
            OVER (PARTITION BY channel, wp.hierarchy_code ORDER BY current_week), 
            0
            ) AS return_inv
        FROM ' || wp_table_name ||' wp 
        WHERE wp.hierarchy_code = ANY(ARRAY[' || array_to_string(hierarchy_code_list, ',') || '])
        AND current_week BETWEEN 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE ''' || sdate ||''') 
            AND 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE ''' || edate ||''' + INTERVAL ''4 week'')
        --and channel in (''EComm'')
    )
    UPDATE ' || wp_table_name ||' wp
    SET return_inv = rinv.return_inv 
    FROM month_bounds rinv
    WHERE 
        rinv.channel = wp.channel
        AND rinv.hierarchy_code = wp.hierarchy_code
        AND rinv.current_week = wp.current_week
        AND wp.current_week BETWEEN 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE ''' || sdate ||''' + INTERVAL ''4 week'')
            AND 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE ''' || edate ||''' + INTERVAL ''4 week'')
    ',  sdate, edate, wp_table_name,hierarchy_code_list);

    -- Debugging: Print the generated SQL
    RAISE NOTICE 'Generated SQL: %', v_sql;
  
    -- Execute the SQL
    EXECUTE v_sql;

    -- Get the number of affected rows
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    -- Return the number of affected rows
    RETURN v_affected_rows;
END;
$function$
;
