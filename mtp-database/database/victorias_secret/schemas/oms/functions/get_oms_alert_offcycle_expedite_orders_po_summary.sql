--liquibase formatted sql
--changeset vishal.kumar:get_oms_alert_offcycle_expedite_orders_po_summary_vs_1 runOnChange:true stripComments:false splitStatements:false context:MTP-127827_1 labels:MTP-127827
--comment: Returns po_id, size, product_code, loc_code, projected_delivery_date, Sum(OO+IT), min(recom_receipt_date)
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_offcycle_expedite_orders_po_summary(input refcursor, jsonb, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_offcycle_expedite_orders_po_summary(
    input refcursor,
    jsonb,
    article text DEFAULT NULL,
    loc_code text DEFAULT NULL
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql                 TEXT := '';
    v_po_summary_sql         TEXT := '';
    v_size_sort_cls          TEXT := 'ORDER BY size_order ASC NULLS LAST';
    v_article_filter          TEXT := '';
    v_loc_code_filter        TEXT := '';
BEGIN
    v_pa_sql := global.form_main_table_filters(
        'product_attributes_filter',
        $2
    );
    v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');

    IF $3 IS NOT NULL AND $3 <> '' THEN
        v_article_filter := ' AND oor.article IN (' ||
            (SELECT string_agg(quote_literal(trim(x)), ',')
             FROM unnest(string_to_array($3, ',')) AS t(x)
             WHERE trim(x) <> '') || ')';
    END IF;
    IF $4 IS NOT NULL AND $4 <> '' THEN
        v_loc_code_filter := ' AND oor.loc_code IN (' ||
            (SELECT string_agg(quote_literal(trim(x)), ',')
             FROM unnest(string_to_array($4, ',')) AS t(x)
             WHERE trim(x) <> '') || ')';
    END IF;

    v_po_summary_sql := '
        WITH base_orders AS (
            SELECT 
                oor.article,
                oor.product_code,
                oor.loc_code,
                oor.size,
                oor.order_type,
                oor.recom_receipt_date,
                ast."order" AS size_order,
                ROW_NUMBER() OVER (
            PARTITION BY oor.article, oor.loc_code, oor.product_code, LOWER(oor.order_type)
            ORDER BY oor.expected_receipt_date
        ) AS rn_ordercycle,
                MIN(CASE WHEN LOWER(oor.order_type) = ''immediate'' THEN oor.expected_receipt_date END)
                    OVER (PARTITION BY oor.article, oor.loc_code, oor.product_code) AS receipt_date_immediate,
                MIN(CASE WHEN LOWER(oor.order_type) = ''order cycle'' THEN oor.expected_receipt_date END)
                    OVER (PARTITION BY oor.article, oor.loc_code, oor.product_code) AS receipt_date_order_cycle
            FROM inventory_smart.oms_orders_recommended oor
            LEFT JOIN (
                SELECT product_code, size, MIN("order") AS "order"
                FROM inventory_smart.article_status_tag
                GROUP BY product_code, size
            ) ast
                ON ast.size = oor.size AND ast.product_code = oor.product_code
            WHERE oor.order_gen_type != ''Manual'' 
                AND LOWER(oor.order_type) IN (''immediate'', ''order cycle'')
                ' || v_article_filter || '
                ' || v_loc_code_filter || '
        )
        ,sorted_data AS (
            SELECT 
                bo.article,
                bo.product_code,
                bo.loc_code,
                bo.size,
                bo.size_order,
                bo.order_type,
                bo.rn_ordercycle,
                bo.recom_receipt_date,
                bo.receipt_date_immediate,
                bo.receipt_date_order_cycle,
                fr.fiscal_year_week AS fiscal_year_week_recom
            FROM base_orders bo
            LEFT JOIN global.fiscal_date_mapping fr
                ON fr.calendar_date = bo.recom_receipt_date
            WHERE NOT ( LOWER(bo.order_type) = ''order cycle'' AND bo.rn_ordercycle > 1)
            ' || v_size_sort_cls || '
        )
        ,paf_kpi_oor AS (
            SELECT
                oor.product_code,
                oor.loc_code,
                oor.fiscal_year_week_recom,
                oor.size
            FROM sorted_data oor
            INNER JOIN global.product_attributes_filter paf
                ON oor.product_code = paf.product_code
            JOIN (SELECT * FROM global.distribution_centres WHERE is_active AND NOT is_deleted) dc
                ON dc.linked_store_code = oor.loc_code
            ' || v_pa_sql || '
        )
        ,po_keys AS (
            SELECT
                product_code,
                loc_code,
                fiscal_year_week_recom,
                MAX(article) AS article,
                MIN(recom_receipt_date) AS recom_receipt_date,
                min(receipt_date_immediate) as immediate_receipt_date,
                MIN(receipt_date_order_cycle) AS order_cycle_receipt_date
            FROM sorted_data
            GROUP BY product_code, loc_code,fiscal_year_week_recom
        )
        ,po_mapped AS (
            SELECT
                CASE
                    WHEN osm.child_sku IS NOT NULL THEN osm.parent_sku
                    ELSE opm.product_code
                END AS product_code,
                opm.loc_code,
                opm.po_id,
                opm.oo,
                opm.it,
                opm.projected_delivery_date
            FROM inventory_smart.oms_po_master opm
            LEFT JOIN (
                SELECT
                    old_product_code AS child_sku,
                    product_code AS parent_sku,
                    CAST(start_date AS date) AS from_date,
                    CAST(end_date AS date) AS to_date
                FROM inventory_smart.product_supersession_mapping
                WHERE CURRENT_DATE BETWEEN CAST(start_date AS date) AND CAST(end_date AS date)
            ) osm
                ON opm.product_code = osm.child_sku
            JOIN po_keys pk
                ON pk.loc_code = opm.loc_code
                AND pk.product_code  = opm.product_code 
            WHERE opm.projected_delivery_date BETWEEN pk.recom_receipt_date
                AND pk.order_cycle_receipt_date
        )
        ,po_mapped_with_recom AS (
            SELECT
                pm.po_id,
                pm.product_code,
                pm.loc_code,
                pm.projected_delivery_date,
                pm.oo,
                pm.it,
                pk.article,
                pk.recom_receipt_date,
                pk.fiscal_year_week_recom
            FROM po_mapped pm
            JOIN po_keys pk
                ON pk.product_code = pm.product_code
                AND pk.loc_code = pm.loc_code
                AND pm.projected_delivery_date BETWEEN pk.recom_receipt_date AND pk.order_cycle_receipt_date
        )
        ,sizes_from_orders AS (
            SELECT DISTINCT
                pko.product_code,
                pko.loc_code,
                pko.size
            FROM paf_kpi_oor pko
        )
        SELECT
            MAX(pmr.article) AS article,
            MAX(concat(pmr.article,pmr.product_code,pmr.loc_code)) as unique_row_id,
            pmr.po_id,
            so.size,
            pmr.product_code,
            pmr.loc_code,
            pmr.projected_delivery_date,
            SUM(COALESCE(pmr.oo, 0) + COALESCE(pmr.it, 0)) AS oo_it,
            MIN(pmr.recom_receipt_date) AS min_recom_receipt_date
        FROM po_mapped_with_recom pmr
        JOIN sizes_from_orders so
            ON so.product_code = pmr.product_code
            AND so.loc_code = pmr.loc_code
        GROUP BY
            pmr.po_id,
            so.size,
            pmr.product_code,
            pmr.loc_code,
            pmr.projected_delivery_date
        ';

    RAISE NOTICE 'v_po_summary_sql: %', v_po_summary_sql;

    OPEN $1 FOR EXECUTE v_po_summary_sql;
    RETURN $1;
END;
$function$;
