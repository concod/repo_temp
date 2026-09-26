--liquibase formatted sql
--changeset chandra.nil.ghosh:Added_get_offcycle_high_level_metrics_7 runOnChange:true stripComments:false splitStatements:false context:MTP-56850 labels:filter_data_by_draft_helper
--comment: Created get_offcycle_high_level_metrics function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_offcycle_high_level_metrics(jsonb, jsonb, jsonb, integer);


CREATE OR REPLACE FUNCTION inventory_smart.get_offcycle_high_level_metrics(
    product_attribute_query jsonb,
    date_filter jsonb,
    store_attribute_query jsonb,
    p_draft_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    start_week INT;
    result_json jsonb;
    v_query TEXT;
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
    v_pa_query text := '';
    v_sa_query text := '';
    v_key TEXT;
    v_values jsonb;
BEGIN
    --------------------------------------------------------------------
    -- Determine current fiscal week
    --------------------------------------------------------------------
    SELECT fiscal_year_week::INT
    INTO start_week
    FROM global.fiscal_date_mapping
    WHERE calendar_date = CURRENT_DATE
    LIMIT 1;

    IF start_week IS NULL THEN
        RAISE EXCEPTION 'fiscal_year_week not found for today';
    END IF;

    --------------------------------------------------------------------
    -- Parse date_filter if provided
    --------------------------------------------------------------------
    IF date_filter IS NOT NULL AND jsonb_typeof(date_filter) = 'array' THEN
        SELECT
            CASE WHEN df->>'start_date' <> '' THEN to_date(df->>'start_date','MM-DD-YYYY') END,
            CASE WHEN df->>'end_date' <> '' THEN to_date(df->>'end_date','MM-DD-YYYY') END
        INTO v_start_date, v_end_date
        FROM jsonb_array_elements(date_filter) AS t(df)
        WHERE df->>'attribute_name' = 'deep_dive_dates'
        LIMIT 1;
    END IF;

    --------------------------------------------------------------------
    -- Convert to fiscal week numbers
    --------------------------------------------------------------------
    IF v_start_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_start_week
        FROM global.fiscal_date_mapping fdm
        WHERE calendar_date = v_start_date LIMIT 1;
    END IF;

    IF v_end_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_end_week
        FROM global.fiscal_date_mapping fdm
        WHERE calendar_date = v_end_date LIMIT 1;
    END IF;

    --------------------------------------------------------------------
    -- Build product attribute filter (for ocr only)
    --------------------------------------------------------------------
    IF product_attribute_query IS NOT NULL 
    AND jsonb_typeof(product_attribute_query) = 'object' THEN

        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(product_attribute_query)
        LOOP
            DECLARE val_list text[];
            BEGIN
                -- Safely extract values array (may be NULL or empty)
                SELECT array_agg(val)
                INTO val_list
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val);

                -- Skip if no values
                IF val_list IS NULL OR array_length(val_list, 1) = 0 THEN
                    CONTINUE;
                END IF;

                -- Append filter
                v_pa_query := v_pa_query ||
                    format(' AND ocr.%I IN (%s)',
                        v_key,
                        (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                    );
            END;
        END LOOP;

    END IF;


    --------------------------------------------------------------------
    -- Build store attribute filter (for ocr only)
    --------------------------------------------------------------------
    IF store_attribute_query IS NOT NULL 
    AND jsonb_typeof(store_attribute_query) = 'object' THEN

        FOR v_key, v_values IN
            SELECT key, value
            FROM jsonb_each(store_attribute_query)
        LOOP
            DECLARE val_list text[];
            BEGIN
                -- Safely extract values array
                SELECT array_agg(val)
                INTO val_list
                FROM jsonb_array_elements_text(v_values->0->'values') AS t(val);

                -- Skip if no values
                IF val_list IS NULL OR array_length(val_list, 1) = 0 THEN
                    CONTINUE;
                END IF;

                -- Append filter
                v_sa_query := v_sa_query ||
                    format(' AND ocr.%I IN (%s)',
                        v_key,
                        (SELECT string_agg(quote_literal(v), ',') FROM unnest(val_list) v)
                    );
            END;
        END LOOP;

    END IF;

    --------------------------------------------------------------------
    -- Build dynamic SQL
    --------------------------------------------------------------------
    v_query := '
    WITH
        weeks AS (
            SELECT DISTINCT fdm.fiscal_year_week AS fiscal_week,
                TO_CHAR(MIN(fdm.calendar_date) OVER (PARTITION BY fdm.fiscal_year_week), ''YYYY-MM-DD'') AS week_start,
                TO_CHAR(MAX(fdm.calendar_date) OVER (PARTITION BY fdm.fiscal_year_week), ''YYYY-MM-DD'') AS week_end,
                TO_CHAR(MIN(fdm.calendar_date) OVER (PARTITION BY fdm.fiscal_year_week), ''Month_YYYY'') AS month_name
            FROM global.fiscal_date_mapping fdm
            WHERE fdm.calendar_date >= CURRENT_DATE
                ' || CASE 
                        WHEN v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
                            ' AND fdm.fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week
                        ELSE ''
                     END || '
            ORDER BY fdm.fiscal_year_week
            LIMIT 52
        ),

        filtered_products AS (
            SELECT DISTINCT ocr.article, ocr.product_code, ocr.loc_code
            FROM inventory_smart.oms_cof_orders_recommended ocr
            WHERE ($1 IS NULL OR ocr.draft_id = $1) AND ocr.is_approved = FALSE
                  ' || v_pa_query || '
                  ' || v_sa_query || '
        ),

        orders_agg AS (
            SELECT
                ocr.receipt_fiscal_year_week::int AS fiscal_week,
                SUM(ocr.raw_roq_cof)::numeric AS raw_roq_sum,
                SUM(ocr.min_order_quantity_sku)::numeric AS min_order_quantity_sku_sum,
                SUM(ocr.min_order_quantity_style)::numeric AS min_order_quantity_style_sum,
                SUM(ocr.min_order_quantity_style_color)::numeric AS min_order_quantity_style_color_sum,
                SUM(ocr.roq_constrained_cof)::numeric AS roq_constrained_sum,
                SUM(ocr.roq_unconstrained_cof)::numeric AS roq_unconstrained_sum,
                SUM(ocr.elt_projected_safety_stock_cof)::numeric AS elt_projected_safety_stock_sum,
                SUM(ocr.order_quantity_cof)::numeric AS order_quantity_sum,
                SUM(ocr.receipt1)::numeric AS ocr_receipt1_sum
            FROM inventory_smart.oms_cof_orders_recommended ocr
            JOIN filtered_products fp
              ON ocr.article = fp.article
             AND ocr.product_code = fp.product_code
             AND ocr.loc_code = fp.loc_code
            WHERE ($1 IS NULL OR ocr.draft_id = $1)
            AND ocr.is_approved = FALSE
            GROUP BY ocr.receipt_fiscal_year_week
        ),

        timeline_agg AS (
            SELECT
                tv.receipt_week::int AS fiscal_week,
                SUM(tv.predicted_qty)::numeric AS predicted_qty_sum,
                SUM(tv.total_dc_forecast)::numeric AS total_dc_forecast_sum,
                SUM(tv.safety_stock_cof)::numeric AS safety_stock_sum,
                SUM(tv.receipt1)::numeric AS receipt1_sum,
                SUM(tv.dc_inv)::numeric AS dc_inv_sum,
                SUM(tv.approved_quantity)::numeric AS approved_quantity_sum,
                SUM(tv.pending_order)::numeric AS pending_order_filtered_sum,
                SUM(tv.pending_order)::numeric AS pending_order_sum
            FROM inventory_smart.oms_cof_timeline_view tv
            JOIN filtered_products fp
              ON tv.article = fp.article
             AND tv.product_code = fp.product_code
             AND tv.loc_code = fp.loc_code
            WHERE ($1 IS NULL OR tv.draft_id = $1)
            GROUP BY tv.receipt_week
        ),

        metric_rows AS (
            SELECT
                ''raw_roq_cof'' AS label,
                ''Base ROQ'' AS metrics,
                jsonb_object_agg(w.fiscal_week::text, COALESCE((oa.raw_roq_sum)::text, ''-'')) AS week_map
            FROM weeks w
            LEFT JOIN orders_agg oa ON oa.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''roq_unconstrained_cof'',
                ''Vendor MOQ Optimized ROQ'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((oa.roq_unconstrained_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN orders_agg oa ON oa.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''order_quantity_cof'',
                ''User Adjusted ROQ'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((oa.order_quantity_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN orders_agg oa ON oa.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''receipt_plan'',
                ''Receipt Plan'',
                jsonb_object_agg(w.fiscal_week::text, ''-'')
            FROM weeks w
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''dc_inv'',
                ''Projected DC BOP'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.dc_inv_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''predicted_qty'',
                ''Sales Forecast'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.predicted_qty_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''total_dc_forecast'',
                ''DC Outflow'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.total_dc_forecast_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''safety_stock_cof'',
                ''Safety Stock'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.safety_stock_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''receipt1'',
                ''On Order Quantity'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.receipt1_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''approved_quantity'',
                ''Approved Orders'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.approved_quantity_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2

            UNION ALL

            SELECT
                ''pending_order'',
                ''Pending Orders'',
                jsonb_object_agg(w.fiscal_week::text, COALESCE((ta.pending_order_filtered_sum)::text, ''-''))
            FROM weeks w
            LEFT JOIN timeline_agg ta ON ta.fiscal_week = w.fiscal_week
            GROUP BY 1,2
        )

    SELECT jsonb_agg(
        jsonb_build_object(''label'', mr.label, ''metrics'', mr.metrics) || mr.week_map
    )
    FROM metric_rows mr
    ';

    --------------------------------------------------------------------
    -- Execute and fetch JSON result
    --------------------------------------------------------------------
    EXECUTE v_query USING p_draft_id INTO result_json;

    IF result_json IS NULL THEN
        result_json := '[]'::jsonb;
    END IF;

    RETURN result_json;
END;
$function$;