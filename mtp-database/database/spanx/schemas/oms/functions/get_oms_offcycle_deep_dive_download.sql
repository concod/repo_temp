--liquibase formatted sql

--changeset piyush.raj@impactanalytics.co:get_oms_offcycle_deep_dive_download_spanx_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-99268 labels:style_order_summary_vs_test_update_24-4
--comment: Created deep dive download function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_offcycle_deep_dive_download(jsonb, jsonb, jsonb, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_offcycle_deep_dive_download(product_attribute_query jsonb DEFAULT NULL::jsonb, date_filter jsonb DEFAULT NULL::jsonb, store_attribute_query jsonb DEFAULT NULL::jsonb, draft_id text DEFAULT NULL::text)
RETURNS TABLE(product_code varchar, article varchar, l0_name varchar, l1_name varchar, l2_name varchar, l3_name varchar, l4_name varchar, l4_id varchar, loc_code varchar, fiscal_year_week integer, month varchar, week timestamp, raw_roq integer, roq_unconstrained integer, roq_receipts integer, po_receipts integer, total_qty_inb integer, forecast integer, exp_bop_dc_inv integer, safety_stock integer, total_dc_forecast integer, receipt_pending integer, approved_receipt integer, ly_sales integer, ly_oh integer, store_name varchar)
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
	v_key text;
    v_values jsonb;
BEGIN
    -- convert draft_id if given
    IF draft_id IS NOT NULL AND trim(draft_id) <> '' THEN
        v_draft_id_int := draft_id::int4;
    END IF;

    -- extract start/end dates if provided (matching get_oms_offcycle_deep_dive.sql exactly)
    IF date_filter IS NOT NULL AND jsonb_typeof(date_filter) = 'array' THEN
        RAISE NOTICE 'Processing date_filter, type: %, is_array: %', jsonb_typeof(date_filter), (jsonb_typeof(date_filter) = 'array');
        
        -- Extract dates - try to get first element that matches
        BEGIN
            SELECT
                CASE WHEN df->>'start_date' <> '' THEN to_date(df->>'start_date','MM-DD-YYYY') END,
                CASE WHEN df->>'end_date' <> '' THEN to_date(df->>'end_date','MM-DD-YYYY') END
            INTO v_start_date, v_end_date
            FROM jsonb_array_elements(date_filter) AS t(df)
            WHERE df->>'attribute_name' = 'deep_dive_dates'
            LIMIT 1;
            
            -- If no rows found, the variables will remain NULL
            IF v_start_date IS NULL AND v_end_date IS NULL THEN
                RAISE NOTICE 'No matching date filter found with attribute_name = deep_dive_dates';
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error extracting dates: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'date_filter is NULL or not an array. type: %', COALESCE(jsonb_typeof(date_filter), 'NULL');
    END IF;

    RAISE NOTICE 'v_start_date: %, v_end_date: %', v_start_date, v_end_date;

    -- map dates to fiscal weeks
    IF v_start_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_start_week
        FROM global.fiscal_date_mapping fdm
        WHERE fdm.calendar_date = v_start_date
        LIMIT 1;
    END IF;

    IF v_end_date IS NOT NULL THEN
        SELECT fdm.fiscal_year_week INTO v_end_week
        FROM global.fiscal_date_mapping fdm
        WHERE fdm.calendar_date = v_end_date
        LIMIT 1;
    END IF;

    RAISE NOTICE 'v_start_week2: %, v_end_week2: %', v_start_week, v_end_week;
    -- Build product attribute filter using form_main_table_filters (matching get_oms_offcycle_deep_dive.sql)
    IF product_attribute_query IS NOT NULL
       AND jsonb_typeof(product_attribute_query) = 'object' THEN
        v_pa_query := global.form_main_table_filters(
            'product_attributes_filter',
            product_attribute_query
        );
        -- v_pa_query := REGEXP_REPLACE(v_pa_query, '([^.])size', '\1paf.size', 'g');
        -- v_pa_query := REGEXP_REPLACE(v_pa_query, '([^.])article', '\1paf.article', 'g');
    ELSE
        v_pa_query := '';
    END IF;

    -- Build store attribute filter using form_main_table_filters (matching get_oms_offcycle_deep_dive.sql)
    IF store_attribute_query IS NOT NULL
       AND jsonb_typeof(store_attribute_query) = 'object' THEN
        v_sa_query := global.form_main_table_filters(
            'store_attributes_filter',
            store_attribute_query
        );
        -- Replace WHERE with AND since we use WHERE 1=1 everywhere
        -- Use both regex and simple replace to ensure it works
        IF v_sa_query LIKE 'WHERE%' THEN
            v_sa_query := 'AND ' || LTRIM(SUBSTRING(v_sa_query FROM 6));
        ELSIF v_sa_query LIKE '% WHERE %' THEN
            v_sa_query := REPLACE(v_sa_query, ' WHERE ', ' AND ');
        END IF;
    ELSE
        v_sa_query := '';
    END IF;

    -- Build product attribute filter SQL using helper
--    v_pa_query := global.form_main_table_filters('product_attributes_filter', product_attribute_query);
--	v_sa_query := global.form_main_table_filters('store_attributes_filter', store_attribute_query);

    -- Build dynamic query
   v_query := '
WITH weeks AS (
    SELECT 
        fdm.fiscal_year_week,
        MIN(fdm.calendar_date) AS week_start,
        MAX(fdm.calendar_date) AS week_end,
        TO_CHAR(MIN(fdm.calendar_date), ''Month_YYYY'') AS month_name
    FROM global.fiscal_date_mapping fdm
    WHERE fdm.calendar_date >= CURRENT_DATE 
    ' || CASE 
         WHEN v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
             ' AND fdm.fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week
         WHEN v_start_week IS NOT NULL THEN
             ' AND fdm.fiscal_year_week >= ' || v_start_week
         WHEN v_end_week IS NOT NULL THEN
             ' AND fdm.fiscal_year_week <= ' || v_end_week
         ELSE ''
       END || '
    GROUP BY fdm.fiscal_year_week
    ORDER BY fdm.fiscal_year_week
    LIMIT 52
),
-- Filter products using product attribute query (matching get_oms_offcycle_deep_dive.sql)
paf_filtered AS (
    select  product_code, l0_name, l1_name, l2_name, l3_name, l4_name, l4_id, size from global.product_attributes_filter
    ' || v_pa_query || '
),

orders_filtered AS (
    SELECT *
    FROM inventory_smart.oms_cof_orders_recommended o
    WHERE o.is_approved = FALSE
    ' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND o.draft_id = ' || v_draft_id_int ELSE '' END || '
    ' || CASE WHEN v_sa_query <> '' THEN 
        REGEXP_REPLACE(
            CASE 
                WHEN v_sa_query LIKE 'WHERE%' THEN 'AND ' || LTRIM(SUBSTRING(v_sa_query FROM 6))
                WHEN v_sa_query LIKE '% WHERE %' THEN REPLACE(v_sa_query, ' WHERE ', ' AND ')
                ELSE v_sa_query
            END,
            '([^.])loc_code', '\1o.loc_code', 'g'
        )
    ELSE '' END || '
),

-- Aggregate timeline_view data by receipt_week
ti_weekly AS (
    SELECT
        ti.receipt_week,
        ti.product_code,
        ti.article,
        ti.loc_code,
        ti.draft_id,
        SUM(ti.predicted_qty)::integer AS forecast,
        SUM(ti.dc_inv)::integer AS exp_bop_dc_inv,
        SUM(ti.safety_stock_cof)::integer AS safety_stock,
        SUM(ti.total_dc_forecast)::integer AS total_dc_forecast,
        SUM(ti.pending_order)::integer AS receipt_pending,
        SUM(ti.approved_quantity)::integer AS approved_receipt,
        SUM(ti.receipt1)::integer AS po_receipts,
        SUM(ti.ly_sales)::integer AS ly_sales,
        SUM(ti.ly_oh)::integer AS ly_oh
    FROM inventory_smart.oms_cof_timeline_view ti
    WHERE (ti.product_code, ti.loc_code) in (select product_code,loc_code  from orders_filtered)
    ' || CASE 
         WHEN v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
             ' AND ti.receipt_week BETWEEN ' || v_start_week || ' AND ' || v_end_week
         WHEN v_start_week IS NOT NULL THEN
             ' AND ti.receipt_week >= ' || v_start_week
         WHEN v_end_week IS NOT NULL THEN
             ' AND ti.receipt_week <= ' || v_end_week
         ELSE ''
       END || '
    
    ' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND ti.draft_id = ' || v_draft_id_int ELSE '' END || '
    GROUP BY ti.receipt_week, ti.product_code, ti.article, ti.loc_code, ti.draft_id
),
-- Aggregate orders_recommended data by receipt_fiscal_year_week (matching get_oms_offcycle_deep_dive.sql)
ocr_weekly AS (
    SELECT
        ocr.receipt_fiscal_year_week,
        ocr.product_code,
        ocr.article,
        ocr.loc_code,
        ocr.draft_id,
        SUM(COALESCE(ocr.raw_roq_cof, 0))::integer AS raw_roq,
        SUM(COALESCE(ocr.roq_unconstrained_cof, 0))::integer AS roq_unconstrained,
        SUM(COALESCE(ocr.order_quantity_cof, 0))::integer AS roq_receipts
    FROM inventory_smart.oms_cof_orders_recommended ocr
    WHERE 1=1
    ' || CASE WHEN v_sa_query <> '' THEN REGEXP_REPLACE(REGEXP_REPLACE(v_sa_query, '^WHERE\s+', 'AND ', 'g'), '([^.])loc_code', '\1ocr.loc_code', 'g') ELSE '' END || '
    AND ocr.is_approved = FALSE
    ' || CASE WHEN v_draft_id_int IS NOT NULL THEN ' AND ocr.draft_id = ' || v_draft_id_int ELSE '' END || '
    ' || CASE
         WHEN v_start_week IS NOT NULL AND v_end_week IS NOT NULL THEN
             ' AND ocr.receipt_fiscal_year_week BETWEEN ' || v_start_week || ' AND ' || v_end_week
         WHEN v_start_week IS NOT NULL THEN
             ' AND ocr.receipt_fiscal_year_week >= ' || v_start_week
         WHEN v_end_week IS NOT NULL THEN
             ' AND ocr.receipt_fiscal_year_week <= ' || v_end_week
         ELSE
             ''
       END || '
    GROUP BY ocr.receipt_fiscal_year_week, ocr.product_code, ocr.article, ocr.loc_code, ocr.draft_id
)
SELECT
    COALESCE(ocr.product_code, ti.product_code) AS product_code,
    COALESCE(ocr.article, ti.article) AS article,
    paf.l0_name,
    paf.l1_name,
    paf.l2_name,
    paf.l3_name,
    paf.l4_name,
    paf.l4_id,
    COALESCE(ocr.loc_code, ti.loc_code) AS loc_code,
    w.fiscal_year_week,
    w.month_name::varchar AS month,

    w.week_start::timestamp as week,
    
    COALESCE(ocr.raw_roq, 0) AS raw_roq,
    COALESCE(ocr.roq_unconstrained, 0) AS roq_unconstrained,
    COALESCE(ocr.roq_receipts, 0) AS roq_receipts,
    COALESCE(ti.po_receipts, 0) AS po_receipts,

    (
        COALESCE(ti.approved_receipt, 0)
      + COALESCE(ti.receipt_pending, 0)
      + COALESCE(ti.po_receipts, 0)
      + COALESCE(ocr.roq_receipts, 0)
    )::integer AS total_qty_inb,

    COALESCE(ti.forecast, 0) AS forecast,
    COALESCE(ti.exp_bop_dc_inv, 0) AS exp_bop_dc_inv,
    COALESCE(ti.safety_stock, 0) AS safety_stock,
    COALESCE(ti.total_dc_forecast, 0) AS total_dc_forecast,
    COALESCE(ti.receipt_pending, 0) AS receipt_pending,
    COALESCE(ti.approved_receipt, 0) AS approved_receipt,
    COALESCE(ti.ly_sales, 0) AS ly_sales,
    COALESCE(ti.ly_oh, 0) AS ly_oh,
    COALESCE(saf.store_name, ''-'') AS store_name

FROM ti_weekly ti
FULL OUTER JOIN ocr_weekly ocr
    ON ti.product_code = ocr.product_code
    AND ti.loc_code = ocr.loc_code
    AND ti.draft_id = ocr.draft_id
    AND ti.receipt_week = ocr.receipt_fiscal_year_week
LEFT JOIN weeks w
    ON w.fiscal_year_week = COALESCE(ti.receipt_week, ocr.receipt_fiscal_year_week)
LEFT JOIN (select store_code, store_name  from global.store_attributes_filter where active = TRUE) saf
    ON saf.store_code = COALESCE(ocr.loc_code, ti.loc_code)
LEFT join paf_filtered  paf
    ON paf.product_code = COALESCE(ocr.product_code, ti.product_code)
ORDER BY
    COALESCE(ocr.article, ti.article),
    COALESCE(ocr.loc_code, ti.loc_code),
    paf.size,
    w.fiscal_year_week;
';


    RAISE NOTICE 'Deep Dive Download Query: %', v_query;
    -- Execute dynamic query
    RETURN QUERY EXECUTE v_query;

END;
$function$
;
