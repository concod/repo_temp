--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:sync_fwos_kpis_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:placeholder
--comment: initial changeset for sync_fwos_kpis_edit - MTP-55332
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sync_fwos(date, date, jsonb, text, text);
CREATE OR REPLACE FUNCTION item_smart.sync_fwos(sdate date, edate date, filters jsonb, dept text, planing_level text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sql            text;
    wp_table_name    text;
    v_affected_rows  integer;
    where_clause     text := ''; -- Initialize the WHERE clause
    filter           jsonb;
    attribute_name   text;
    values           text;
    operator         text;
    is_special_order_condition text := '';

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

    RAISE NOTICE 'v_sql : %', where_clause;

    -- Construct the full SQL query
    v_sql := format('
    WITH month_bounds AS (
        SELECT b.*, 
        MIN(CASE WHEN a.fiscal_year_month BETWEEN min_month_minus5 AND min_month THEN fiscal_year_week END) AS min_week,
        MAX(fiscal_year_week) AS max_week_plus6m,
        MIN(CASE WHEN a.fiscal_year_month BETWEEN min_month_minus5 AND min_month THEN fiscal_year_week END) AS min_week_minus5m
        FROM global.fiscal_date_mapping a
        JOIN (
            SELECT 
                MIN(fiscal_year_month) AS min_month, 
                MAX(fiscal_year_month) AS max_month, 
                CASE WHEN MOD(MAX(fiscal_year_month), 100) > 7 
                    THEN MAX(fiscal_year_month) + 100 - 7 
                    ELSE MAX(fiscal_year_month) + 5 END AS max_month_plus5,
                CASE WHEN MOD(MIN(fiscal_year_month), 100) <= 5 
                    THEN MIN(fiscal_year_month) - 100 + 7 
                    ELSE MIN(fiscal_year_month) - 5 END AS min_month_minus5
            FROM global.fiscal_date_mapping
            WHERE calendar_date BETWEEN %L AND %L
        ) b
        ON a.fiscal_year_month BETWEEN b.min_month_minus5 AND b.max_month_plus5
        GROUP BY 1,2,3,4
    ),
    sales_data AS (
        SELECT 
            wp.hierarchy_code,
            channel,
            written_sales_cost,
            written_sales_units,
            fdm.*
        FROM 
            %s wp
        JOIN 
            (
                SELECT hierarchy_code, style
                FROM item_smart.mv_product_hierarchies_filter
                WHERE %s
                UNION ALL 
                SELECT hierarchy_code, style
                FROM item_smart.placeholders_info
                WHERE %s
            ) phf ON wp.hierarchy_code = phf.hierarchy_code
        JOIN 
            (
                SELECT 
                    fdm.fiscal_year_week AS current_week,
                    fdm.fiscal_year,
                    fdm.fiscal_month_in_year,
                    fdm.fiscal_month_name_abb,
                    fdm.fiscal_quarter_name_abb, 
                    fdm.fiscal_year_month AS year_month_key,
                    ARRAY_AGG(DISTINCT fdm.fiscal_year_week) AS fiscal_year_week,
                    COUNT(*) AS no_days_in_week    
                FROM  
                    global.fiscal_date_mapping fdm
                CROSS JOIN 
                    month_bounds mb
                WHERE 
                    fdm.fiscal_year_month BETWEEN mb.min_month_minus5 AND mb.max_month_plus5
                GROUP BY 
                    fdm.fiscal_year_week, fdm.fiscal_year, fdm.fiscal_month_in_year, fdm.fiscal_month_name_abb, fdm.fiscal_quarter_name_abb, fdm.fiscal_year_month
            ) fdm ON wp.current_week = ANY(fdm.fiscal_year_week)
        CROSS JOIN 
            month_bounds mb
        WHERE 
            channel IN (''Brick __ia_char_13 Mortar'',''E-Commerce'')
            AND wp.current_week BETWEEN mb.min_week AND mb.max_week_plus6m
        ORDER BY 
            wp.hierarchy_code, channel, year_month_key
    ),
	monthly_data AS (
        SELECT 
        channel,
        hierarchy_code,
        year_month_key,
        SUM(written_sales_cost) AS monthly_written_sales_cost,
        SUM(written_sales_units) AS monthly_written_sales_units,
        SUM(no_days_in_week) AS monthly_days
        FROM 
        sales_data
        GROUP BY 
        channel,
        hierarchy_code, 
        year_month_key
    ),
    monthly_normalized_sales AS (
        SELECT 
        md.channel,
        md.hierarchy_code,
        md.year_month_key,
        SUM(md.monthly_written_sales_units) OVER (
            PARTITION BY md.channel, md.hierarchy_code 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 following
        ) as sales_over_six_months,
        SUM(md.monthly_written_sales_cost) OVER (
            PARTITION BY md.channel, md.hierarchy_code 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 following
        ) as cogs_over_six_months,       
        SUM(md.monthly_days) OVER (
            PARTITION BY md.channel, md.hierarchy_code 
            ORDER BY md.year_month_key 
            ROWS BETWEEN CURRENT ROW AND 5 FOLLOWING
        ) AS days_over_six_months
        from 
        monthly_data md
    ),
	sales_for_channel AS (
        SELECT 
            mn.channel,
            mn.hierarchy_code, 
            mn.year_month_key, 
            mn.days_over_six_months, 
            sd.current_week,
            SUM(sales_over_six_months) AS sales_over_six_months, 
            SUM(cogs_over_six_months) AS cogs_over_six_months
        FROM 
            monthly_normalized_sales mn
        JOIN 
            sales_data sd
        ON 
            mn.hierarchy_code = sd.hierarchy_code 
            AND mn.year_month_key = sd.year_month_key
            AND mn.channel = sd.channel
        GROUP BY 
            mn.channel, mn.hierarchy_code, mn.year_month_key, days_over_six_months, sd.current_week
    ),
    ecom_store_sums AS (
        SELECT 
            channel,
            hierarchy_code,
            year_month_key,
            days_over_six_months,
            current_week,
            SUM(sales_over_six_months) AS sales_over_six_months,
            SUM(cogs_over_six_months) AS cogs_over_six_months
        FROM 
            sales_for_channel
        WHERE channel IN (''Brick __ia_char_13 Mortar'',''E-Commerce'')
        GROUP BY 
            channel,hierarchy_code, year_month_key, days_over_six_months, current_week
    ),
    updated_warehouse_sales AS (
        SELECT 
            sf.channel,
            sf.hierarchy_code, 
            sf.year_month_key, 
            sf.days_over_six_months, 
            sf.current_week,
            sf.sales_over_six_months + COALESCE(es.sales_over_six_months, 0) AS sales_over_six_months,
            sf.cogs_over_six_months + COALESCE(es.cogs_over_six_months, 0) AS cogs_over_six_months
        FROM 
            sales_for_channel sf
        LEFT JOIN 
            ecom_store_sums es
        ON 
            sf.hierarchy_code = es.hierarchy_code
            AND sf.year_month_key = es.year_month_key
            AND sf.current_week = es.current_week
            AND sf.channel = es.channel
        --WHERE 
           -- sf.channel = ''Warehouse''
    ),
    normalized_sales AS (
        SELECT 
            md.channel,
            sd.current_week,
            sd.hierarchy_code,
            sd.year_month_key,
            ((md.sales_over_six_months * 7) / md.days_over_six_months)::FLOAT AS normalized_sales,
            ((md.cogs_over_six_months * 7) / md.days_over_six_months)::FLOAT AS normalized_cogs
        FROM 
            sales_data sd
        JOIN 
            updated_warehouse_sales md
        ON 
            sd.channel = md.channel 
            AND sd.hierarchy_code = md.hierarchy_code 
            AND sd.year_month_key = md.year_month_key
            AND sd.current_week = md.current_week
            AND sd.channel = md.channel
    )
    UPDATE %s wp
    SET
        bop_units = wp.bop_units / NULLIF(fwos.normalized_sales, 0)
    FROM
        normalized_sales fwos
    WHERE
        fwos.channel = wp.channel
        AND fwos.hierarchy_code = wp.hierarchy_code
        AND fwos.current_week = wp.current_week
    ', sdate, edate, wp_table_name, where_clause, where_clause, wp_table_name);
    
    -- Raise notice for debugging
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
