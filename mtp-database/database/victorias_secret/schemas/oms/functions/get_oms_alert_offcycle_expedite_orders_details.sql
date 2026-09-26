--liquibase formatted sql
--changeset chandranil.ghosh:get_oms_alert_offcycle_expedite_orders_details_vs_5 runOnChange:true stripComments:false splitStatements:false context:MTP-127827 labels:MTP-108671
--comment: MTP-126974 Reverted the change of removing size column from the parent
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_offcycle_expedite_orders_details(input refcursor, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_offcycle_expedite_orders_details(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_offcycle_expedite_orders_details(input refcursor, jsonb, boolean);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_offcycle_expedite_orders_details(input refcursor, jsonb, jsonb, boolean);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_alert_offcycle_expedite_orders_details(input refcursor, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_alert_offcycle_expedite_orders_details(
    input refcursor,
    jsonb,
    start_date date DEFAULT NULL,
    end_date date DEFAULT NULL
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql                 TEXT := '';
    v_pa_and_sql             TEXT := '';
    v_offcycle_expedite_orders_sql    TEXT := '';
    v_size_sort_cls          TEXT := 'ORDER BY size_order ASC NULLS LAST';
    v_date_filter            TEXT := '';
BEGIN
    v_pa_sql := global.form_main_table_filters(
        'product_attributes_filter',
        $2
    );
    v_pa_sql := REPLACE(v_pa_sql, ' product_code ', ' paf.product_code ');
    IF v_pa_sql IS NOT NULL AND v_pa_sql <> '' THEN
        v_pa_and_sql := REPLACE(v_pa_sql, 'WHERE', 'AND');
    END IF;

    IF $3 IS NOT NULL THEN
        v_date_filter := v_date_filter || ' AND base.first_projected_delivery_date >= ' || format('%L', $3) || '::date';
    END IF;
    IF $4 IS NOT NULL THEN
        v_date_filter := v_date_filter || ' AND base.first_projected_delivery_date <= ' || format('%L', $4) || '::date';
    END IF;

    v_offcycle_expedite_orders_sql := '
        WITH base_orders AS (
            SELECT 
                oor.*,
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
        )
        ,sorted_data AS (
            SELECT 
                bo.*,
                fr.fiscal_year_week AS fiscal_year_week_recom,
                fr.fiscal_year_month AS fiscal_year_month_recom,
                fr.fiscal_year AS fiscal_year_recom
            FROM base_orders bo
            LEFT JOIN global.fiscal_date_mapping fr
                ON fr.calendar_date = bo.recom_receipt_date
            WHERE NOT ( LOWER(order_type) = ''order cycle'' AND rn_ordercycle > 1)
            ' || v_size_sort_cls || '
        )
        ,paf_kpi_oor AS (
            SELECT 
                paf.l0_name,
                paf.l1_name,
                paf.l2_name,
                paf.l3_name,
                paf.l4_name,
                paf.l5_name,
                paf.l6_name,
                paf.l6_id,
                paf.masterstyle_descr,
                paf.color,
                paf.subbrand_code_desc,
                paf.collection,
                paf.current_assortment_group,
                paf.product_lifecycle,
                paf.flex_style,
                paf.generic,
                paf.sizes_mat,
                paf.form,
                paf.user_defined_1,
                paf.user_defined_2,
                paf.user_defined_3,
                paf.user_defined_4,
                paf.user_defined_5,
                paf.user_defined_6,
                oor.*
            FROM
                sorted_data oor
            INNER JOIN 
                global.product_attributes_filter paf
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
                opm.fiscal_year_week,
                opm.po_id,
                opm.oo,
                opm.it,
                opm.pseudo_po,
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
        ,po_window AS (
            SELECT
                pm.product_code,
                pm.loc_code,
                COUNT(DISTINCT pm.po_id) AS po_count,
                SUM(COALESCE(pm.oo, 0) + COALESCE(pm.it, 0)) AS po_units,
                MIN(pm.projected_delivery_date) AS first_projected_delivery_date
            FROM po_mapped pm
            GROUP BY 1, 2
        )
        ,receipt_weeks AS (
            SELECT
                pk.product_code,
                pk.loc_code,
                fd1.fiscal_year_week AS immediate_receipt_week,
                fd2.fiscal_year_week AS order_cycle_receipt_week
            FROM po_keys pk
            LEFT JOIN global.fiscal_date_mapping fd1
                ON fd1.calendar_date = pk.immediate_receipt_date
            LEFT JOIN global.fiscal_date_mapping fd2
                ON fd2.calendar_date = pk.order_cycle_receipt_date
        )
        SELECT *, (receipt_date_order_cycle - receipt_date_immediate) AS days_between_cycles
        FROM (
            SELECT 
                MAX(pko.l6_id) AS l6_id,
                MAX(pko.article) AS article,
                pko.loc_code,
                pko.channel,
                pko.size,
                MAX(concat(pko.article, pko.loc_code)) as unique_row_id,
                MAX(concat(pko.article, pko.loc_code)) as id,
                MAX(pko.l6_name) AS l6_name,
                MAX(pko.l0_name) AS l0_name,
                MAX(pko.l1_name) AS l1_name,
                MAX(pko.l2_name) AS l2_name,
                MAX(pko.l3_name) AS l3_name,
                MAX(pko.l4_name) AS l4_name,
                MAX(pko.l5_name) AS l5_name,
                MAX(pko.masterstyle_descr) AS master_style,
                MAX(pko.subbrand_code_desc) AS subbrand_code_desc,
                MAX(pko.product_lifecycle) AS product_lifecycle,
                MAX(pko.color) AS color,
                MAX(pko.collection) AS collection,
                MAX(pko.current_assortment_group) AS current_assortment_group,
                MAX(pko.flex_style) AS flex_style,
                MAX(pko.generic) AS generic,
                MAX(pko.sizes_mat) AS sizes_mat,
                MAX(pko.form) AS form,
                MAX(pko.user_defined_1) AS user_defined_1,
                MAX(pko.user_defined_2) AS user_defined_2,
                MAX(pko.user_defined_3) AS user_defined_3,
                MAX(pko.user_defined_4) AS user_defined_4,
                MAX(pko.user_defined_5) AS user_defined_5,
                MAX(pko.user_defined_6) AS user_defined_6,
                MIN(pko.recom_receipt_date) AS recom_receipt_date,
                SUM(CASE WHEN LOWER(pko.order_type) = ''immediate'' THEN COALESCE(pko.order_quantity, 0) ELSE 0 END) AS raw_roq_immediate,
                SUM(CASE WHEN LOWER(pko.order_type) = ''immediate'' THEN COALESCE(pko.raw_roq, 0) ELSE 0 END) AS off_cycle_raw_roq_immediate,
                MIN(CASE WHEN LOWER(pko.order_type) = ''immediate'' THEN pko.expected_receipt_date END) AS receipt_date_immediate,
                SUM(CASE WHEN LOWER(pko.order_type) = ''order cycle'' THEN COALESCE(pko.order_quantity, 0) ELSE 0 END) AS raw_roq_order_cycle,
                MIN(CASE WHEN LOWER(pko.order_type) = ''order cycle'' THEN pko.expected_receipt_date END) AS receipt_date_order_cycle,
                COALESCE(MAX(po.po_count), 0) AS po_count,
                COALESCE(MAX(po.po_units), 0) AS po_units,
                MIN(po.first_projected_delivery_date) AS first_projected_delivery_date,
                BOOL_OR(pko.order_status_id = 3) AS is_resolved
            FROM paf_kpi_oor pko
            LEFT JOIN 
                po_window po
                    ON pko.product_code = po.product_code  
                    AND pko.loc_code = po.loc_code
            GROUP BY pko.article,pko.loc_code, pko.channel,pko.size
        ) base
        WHERE 1=1 ' || v_date_filter || '
        ';

    RAISE NOTICE 'v_offcycle_expedite_orders_sql: %', v_offcycle_expedite_orders_sql;

    OPEN $1 FOR EXECUTE v_offcycle_expedite_orders_sql;
    RETURN $1;
END;
$function$;

