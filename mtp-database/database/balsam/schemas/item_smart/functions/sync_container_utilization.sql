--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:sync_container_utilization runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sync_container_utilization
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sync_container_utilization(date, date, jsonb, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.sync_container_utilization(sdate date, edate date, filters jsonb, dept text, planing_level text, hierarchy_code_list integer[])
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
    v_gen_random_uuid text  := gen_random_uuid()::varchar;

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
            sub_channel, 
            current_week,
            COALESCE(total_receipt_units * phf.container_utilization::numeric, 0) AS container_count
        FROM ' || wp_table_name ||' wp 
        JOIN (
            SELECT hierarchy_code,container_utilization 
            FROM item_smart.mv_product_hierarchies_filter
            WHERE %s  
            UNION ALL 
            SELECT hierarchy_code, null as container_utilization
            FROM item_smart.placeholders_info
            WHERE %s
        ) phf
        ON wp.hierarchy_code = phf.hierarchy_code 
        WHERE current_week BETWEEN 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE %L) 
            AND 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE %L)
			and wp.hierarchy_code = ANY(ARRAY[' || array_to_string(hierarchy_code_list, ',') || '])
		
    )
    UPDATE %s wp
    SET container_count = rinv.container_count 
    FROM month_bounds rinv
    WHERE 
        rinv.channel = wp.channel
        AND rinv.sub_channel = wp.sub_channel
        AND rinv.hierarchy_code = wp.hierarchy_code
        AND wp.current_week BETWEEN 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE %L)
            AND 
            (SELECT DISTINCT fiscal_year_week FROM "global".fiscal_date_mapping WHERE calendar_date = DATE %L)
    ', where_clause, where_clause, sdate, edate, wp_table_name, sdate, edate,hierarchy_code_list);

    -- Debugging: Print the generated SQL
    RAISE NOTICE 'Generated SQL: %', v_sql;
  
    -- Execute the SQL
    EXECUTE v_sql;

    -- Get the number of affected rows
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;

    -- perform sp log
    perform global.sp_log(v_gen_random_uuid, 'item_smart.sync_container_utilization', 'before returning v_affected_rows', v_sql, jsonb_build_object('sdate',$1, 'edate', $2, 'filters',$3, 'dept',$4, 'planing_level',$5));

    -- Return the number of affected rows
    RETURN v_affected_rows;
END;
$function$
;
