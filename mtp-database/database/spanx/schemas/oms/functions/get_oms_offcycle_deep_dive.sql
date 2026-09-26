--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:get_oms_offcycle_order_summary_list_spanx_v17 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-1
--comment: logic change for total_on_order
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_deep_dive(jsonb, jsonb, jsonb, text);

-- DROP FUNCTION inventory_smart.get_oms_offcycle_deep_dive(jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_offcycle_deep_dive(product_attribute_query jsonb, date_filter jsonb, store_attribute_query jsonb, draft_id text DEFAULT NULL::text)
 RETURNS TABLE(fiscal_year_week integer, month_name character varying, week_end_date timestamp with time zone, week timestamp with time zone, raw_roq real, order_quantity real, roq_unconstrained real, roq_constrained real, roq_receipts real, order_cycle_receipt real, forecast real, receipt_inventory real, po_receipts real, exp_bop_dc_inv real, safety_stock real, total_dc_forecast real, receipt_pending real, approved_receipt real, ly_sales real, ly_oh real)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_start_date date := NULL;
    v_end_date date := NULL;
    v_start_week int4 := NULL;
    v_end_week int4 := NULL;
    v_draft_id_int int4 := NULL;
    v_pa_query text := '';
    v_sa_query text := '';
    v_query text := '';
BEGIN
    --------------------------------------------------------------------
    -- Convert draft id
    --------------------------------------------------------------------
    IF draft_id IS NOT NULL AND trim(draft_id) <> '' THEN
        v_draft_id_int := draft_id::int4;
    END IF;

    --------------------------------------------------------------------
    -- Extract date range
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
    -- Build product attribute filter
    --------------------------------------------------------------------
    IF product_attribute_query IS NOT NULL
       AND jsonb_typeof(product_attribute_query) = 'object' THEN
        v_pa_query := global.form_main_table_filters(
            'product_attributes_filter',
            product_attribute_query
        );
        v_pa_query := REGEXP_REPLACE(v_pa_query, '([^.])size', '\1paf.size', 'g');
        v_pa_query := REGEXP_REPLACE(v_pa_query, '([^.])article', '\1paf.article', 'g');
    ELSE
        v_pa_query := '';
    END IF;

    --------------------------------------------------------------------
    -- Build store attribute filter
    --------------------------------------------------------------------
    IF store_attribute_query IS NOT NULL
       AND jsonb_typeof(store_attribute_query) = 'object' THEN
        v_sa_query := global.form_main_table_filters(
            'store_attributes_filter',
            store_attribute_query
        );
        -- Replace all instances of loc_code with o.loc_code using regex
        v_sa_query := REGEXP_REPLACE(v_sa_query, '([^.])loc_code', '\1o.loc_code', 'g');
    ELSE
        v_sa_query := '';
    END IF;

    --------------------------------------------------------------------
    -- Build main query
    --------------------------------------------------------------------
    v_query := '
        WITH weeks AS (
            SELECT DISTINCT fdm.fiscal_year_week,
                TO_CHAR(MIN(fdm.calendar_date) OVER (PARTITION BY fdm.fiscal_year_week), ''YYYY-MM-DD'') AS week_start,
                TO_CHAR(MAX(fdm.calendar_date) OVER (PARTITION BY fdm.fiscal_year_week), ''YYYY-MM-DD'') AS week_end,
                TO_CHAR(MIN(fdm.calendar_date) OVER (PARTITION BY fdm.fiscal_year_week), ''Month_YYYY'') AS month_name
            FROM global.fiscal_date_mapping fdm
            WHERE fdm.calendar_date >= CURRENT_DATE
            ORDER BY fdm.fiscal_year_week
            LIMIT 52
        ),

        paf_filtered AS (
            SELECT distinct paf.product_code FROM global.product_attributes_filter paf
			join inventory_smart.oms_cof_orders_recommended o on o.article = paf.article
            ' || v_pa_query || '
			' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND o.draft_id = ' || v_draft_id_int ELSE '' END || '
			 and is_approved = false
        ),

        ti_weekly AS (
            SELECT
                t.receipt_week::int AS fiscal_year_week,
                SUM(t.predicted_qty) AS forecast,
                SUM(t.dc_inv) AS receipt_inventory,
                SUM(t.receipt1) AS po_receipts,
                SUM(t.dc_inv) AS exp_bop_dc_inv,
                SUM(t.safety_stock_cof) AS safety_stock,
                SUM(t.total_dc_forecast) AS total_dc_forecast,
                SUM(t.pending_order) AS receipt_pending,
                SUM(t.approved_quantity) AS approved_receipt,
                SUM(t.ly_sales) AS ly_sales,
                SUM(t.ly_oh) AS ly_oh,
                t.draft_id
            FROM inventory_smart.oms_cof_timeline_view t
            JOIN paf_filtered paf ON paf.product_code = t.product_code
            ' || CASE 
                    WHEN v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
                        ' AND t.receipt_week BETWEEN ' || v_start_week || ' AND ' || v_end_week || ' '
                    ELSE ''
                END || '
            join inventory_smart.oms_cof_orders_recommended o on o.product_code = t.product_code and o.loc_code = t.loc_code
            ' || v_sa_query || ' AND o.is_approved = FALSE 
			' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND o.draft_id = ' || v_draft_id_int ELSE '' END || '
            GROUP BY t.receipt_week, t.draft_id
        ),

        ocr_weekly AS (
            SELECT
                o.receipt_fiscal_year_week::int AS receipt_fiscal_year_week,
                SUM(o.raw_roq_cof) AS raw_roq,
                SUM(o.order_quantity_cof) AS order_quantity,
                SUM(o.roq_unconstrained_cof) AS roq_unconstrained,
                SUM(o.roq_constrained_cof) AS roq_constrained,
            --    SUM(o.receipt1) AS po_receipts,
                SUM(o.order_quantity_cof) AS roq_receipts,
                SUM(o.order_quantity_cof) AS order_cycle_receipt,
                o.draft_id
            FROM inventory_smart.oms_cof_orders_recommended o
            JOIN paf_filtered paf ON paf.product_code = o.product_code
            ' || v_sa_query || ' AND o.is_approved = FALSE
			' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND o.draft_id = ' || v_draft_id_int ELSE '' END || '
            GROUP BY o.receipt_fiscal_year_week, o.draft_id
        )

        SELECT
            ti.fiscal_year_week,
            w.month_name::varchar,
            TO_TIMESTAMP(w.week_end, ''YYYY-MM-DD'') AS week_end_date,
            TO_TIMESTAMP(w.week_start, ''YYYY-MM-DD'') AS week,
            COALESCE(ocr.raw_roq,0)::float4 as raw_roq_cof,
            COALESCE(ocr.order_quantity,0)::float4 as order_quantity_cof,
            COALESCE(ocr.roq_unconstrained,0)::float4 as roq_unconstrained_cof,
            COALESCE(ocr.roq_constrained,0)::float4 as roq_constrained_cof,
            COALESCE(ocr.roq_receipts,0)::float4 as roq_receipts,
            COALESCE(ocr.order_cycle_receipt,0)::float4 as order_cycle_receipt,
            ti.forecast::float4 as forecast,
            ti.receipt_inventory::float4 as receipt_inventory,
            ti.po_receipts::float4 as po_receipts,
            ti.exp_bop_dc_inv::float4 as exp_bop_dc_inv,
            ti.safety_stock::float4 as safety_stock,
            ti.total_dc_forecast::float4 as total_dc_forecast,
            ti.receipt_pending::float4 as receipt_pending,
            ti.approved_receipt::float4 as approved_receipt,
            ti.ly_sales::float4 as ly_sales,
            ti.ly_oh::float4 as ly_oh
        FROM ti_weekly ti
        LEFT JOIN weeks w ON w.fiscal_year_week = ti.fiscal_year_week
        LEFT JOIN ocr_weekly ocr
            ON ocr.receipt_fiscal_year_week = ti.fiscal_year_week
            AND ocr.draft_id = ti.draft_id
        WHERE 1=1
        ' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND ti.draft_id = ' || v_draft_id_int ELSE '' END || '
        ORDER BY ti.fiscal_year_week;
        ';
    RETURN QUERY EXECUTE v_query;
END;
$function$
;