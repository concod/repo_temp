--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:inv_adj_metrics_edit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_inv_adj_metrics_edit
--comment: initial changeset for inv_adj_metrics_edit
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.update_inv_adj_metrics_v3(text, date, date, int4, int4, jsonb, text, text);

CREATE OR REPLACE FUNCTION item_smart.update_inv_adj_metrics_v3(p_kpi_name text, p_sdate date, p_edate date, p_start_week_id integer, p_end_week_id integer, filters jsonb, p_dept text, p_channel text)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    wp_table TEXT;
    update_sql TEXT;
    set_clause TEXT;
    rows_updated INTEGER;

    ph_where_clause TEXT := '';
    fiscal_where_clause TEXT := '';
    filter JSONB;
    attribute_name TEXT;
    values TEXT;
    operator TEXT;

    is_special_order_condition TEXT := '';
BEGIN
    -- Construct table name
    wp_table := 'item_smart.wp_master_' || p_dept || '_' || p_channel;

    -- Build dynamic WHERE clause from filters JSONB
    FOR filter IN
        SELECT * FROM jsonb_array_elements(filters)
    LOOP
        attribute_name := filter->>'attribute_name';
        values := (
            SELECT string_agg(quote_literal(value), ', ')
            FROM jsonb_array_elements_text(filter->'value') value
        );
        operator := filter->>'operator';

        -- Special SPO / REGULAR handling
        IF attribute_name = 'l3_name' THEN
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

        -- Assign filter to correct clause
        IF operator = 'in' THEN
            IF attribute_name IN ('l0_name','l1_name','l2_name','l3_name','l4_name','l5_name','item') THEN
                ph_where_clause := CASE 
                    WHEN ph_where_clause = '' THEN format('%I %s (%s)', attribute_name, operator, values)
                    ELSE ph_where_clause || format(' AND %I %s (%s)', attribute_name, operator, values)
                END;
            ELSIF attribute_name IN ('fiscal_year','fiscal_quarter_name_abb','fiscal_month_name_abb','date') THEN
                fiscal_where_clause := CASE 
                    WHEN fiscal_where_clause = '' THEN format('%I %s (%s)', attribute_name, operator, values)
                    ELSE fiscal_where_clause || format(' AND %I %s (%s)', attribute_name, operator, values)
                END;
            ELSE
                RAISE NOTICE 'Skipping unknown attribute: %', attribute_name;
            END IF;
        ELSE
            RAISE NOTICE 'Unsupported operator: %', operator;
        END IF;
    END LOOP;

    -- Add SPO condition if needed
    IF is_special_order_condition <> '' THEN
        ph_where_clause := CASE 
            WHEN ph_where_clause = '' THEN is_special_order_condition
            ELSE ph_where_clause || ' AND ' || is_special_order_condition
        END;
    END IF;

    -- Default empty clauses to 1=1
    IF ph_where_clause = '' THEN
        ph_where_clause := '1=1';
    END IF;
    IF fiscal_where_clause = '' THEN
        fiscal_where_clause := '1=1';
    END IF;

    -- Build SET clause dynamically
    IF p_kpi_name = 'rtp_sales_units_perc' THEN
        set_clause := 'rtp_units = u.rtp_units, rtp_dollar = u.rtp_dollar';
    ELSIF p_kpi_name = 'warranty_sales_units_perc' THEN
        set_clause := 'warranty_units = u.warranty_units, warranty_dollar = u.warranty_dollar';
    ELSIF p_kpi_name = 'zero_dollar_orders_perc' THEN
        set_clause := 'zero_dollar_orders_units = u.zero_dollar_orders_units, zero_dollar_orders_dollar = u.zero_dollar_orders_dollar';
    ELSIF p_kpi_name = 'all' THEN
        set_clause := '
            rtp_units = u.rtp_units,
            rtp_dollar = u.rtp_dollar,
            warranty_units = u.warranty_units,
            warranty_dollar = u.warranty_dollar,
            zero_dollar_orders_units = u.zero_dollar_orders_units,
            zero_dollar_orders_dollar = u.zero_dollar_orders_dollar
        ';
    ELSE
        RAISE EXCEPTION 'Unsupported KPI: %', p_kpi_name;
    END IF;

    -- Build final update SQL
    update_sql := format($f$
        WITH channel_sales AS (
            SELECT 
                wp.hierarchy_code, 
                wp.current_week,
                SUM(wp.written_sales_units) AS total_written_sales_units
            FROM %s wp
            JOIN (
                SELECT hierarchy_code, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, item
                FROM item_smart.mv_product_hierarchies_filter
                WHERE %s
                UNION ALL
                SELECT hierarchy_code, l0_name, l1_name, l2_name, l3_name, l4_name, l5_name, item
                FROM item_smart.placeholders_info
                WHERE %s AND is_cadence_generated = true
            ) pa ON wp.hierarchy_code = pa.hierarchy_code
            JOIN (
                SELECT DISTINCT fiscal_year_week
                FROM "global".fiscal_date_mapping
                WHERE %s
                AND "date" BETWEEN %L AND %L
            ) fdm ON fdm.fiscal_year_week = wp.current_week
            WHERE wp.current_week BETWEEN %s AND %s
            GROUP BY wp.hierarchy_code, wp.current_week
        ),
        updated_values AS (
            SELECT 
                wp.hierarchy_code,
                wp.current_week,
                wp.channel,
                wp.sub_channel,

                -- RTP
                COALESCE(wp.rtp_sales_units_perc,0) * COALESCE(cs.total_written_sales_units,0) AS rtp_units,
                (COALESCE(wp.rtp_sales_units_perc,0) * COALESCE(cs.total_written_sales_units,0)) * COALESCE(wp.auc_landed,0) AS rtp_dollar,

                -- Warranty
                COALESCE(wp.warranty_sales_units_perc,0) * COALESCE(cs.total_written_sales_units,0) AS warranty_units,
                (COALESCE(wp.warranty_sales_units_perc,0) * COALESCE(cs.total_written_sales_units,0)) * COALESCE(wp.auc_landed,0) AS warranty_dollar,

                -- Zero Dollar Orders
                COALESCE(wp.zero_dollar_orders_perc,0) * COALESCE(cs.total_written_sales_units,0) AS zero_dollar_orders_units,
                (COALESCE(wp.zero_dollar_orders_perc,0) * COALESCE(cs.total_written_sales_units,0)) * COALESCE(wp.auc_landed,0) AS zero_dollar_orders_dollar
            FROM %s wp
            JOIN channel_sales cs 
              ON wp.hierarchy_code = cs.hierarchy_code
             AND wp.current_week = cs.current_week
            WHERE wp.current_week BETWEEN %s AND %s
              AND wp.sub_channel LIKE '%%warehouse'
        )
        UPDATE %s wp
        SET %s
        FROM updated_values u
        WHERE wp.hierarchy_code = u.hierarchy_code
          AND wp.current_week = u.current_week
          AND wp.channel = u.channel
          AND wp.sub_channel = u.sub_channel
          AND wp.actualised = false
          AND wp.current_week BETWEEN %s AND %s
    $f$,
        wp_table,
        ph_where_clause,
        ph_where_clause,
        fiscal_where_clause,
        p_sdate, p_edate,
        p_start_week_id, p_end_week_id,
        wp_table,
        p_start_week_id, p_end_week_id,
        wp_table,
        set_clause,
        p_start_week_id, p_end_week_id
    );

    RAISE NOTICE 'Executing query: %', update_sql;

    EXECUTE update_sql;
    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    RETURN rows_updated;
END;
$function$
;
