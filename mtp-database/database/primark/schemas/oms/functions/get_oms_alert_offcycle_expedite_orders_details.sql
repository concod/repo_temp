--liquibase formatted sql
--changeset chandranil.ghosh@impactanalytics.co:primark_approval_pane_base_13 runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:MTP-55924v2
--comment: MTP-126974 Removed l2_name from the function
--rollback: SELECT 1


DROP FUNCTION IF EXISTS oms.get_oms_alert_offcycle_expedite_orders_details(refcursor, jsonb, date, date);

CREATE OR REPLACE FUNCTION oms.get_oms_alert_offcycle_expedite_orders_details(input_refcursor refcursor, product_attribute_query jsonb, start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
    v_sql    text;
BEGIN
    v_pa_sql := oms.form_main_table_filters('ph_master', product_attribute_query);

    v_sql :=
        'SELECT
            oor.article                                AS l6_id,
            oor.article,
            oor.loc_code,
            oor.size,
            oor.channel,
            CONCAT(oor.article, oor.loc_code)         AS unique_row_id,
            CONCAT(oor.article, oor.loc_code)         AS id,
            ast."order"                               AS size_order,
            oor.recom_receipt_date,
            oor.expected_receipt_date                 AS receipt_date_immediate,
            oor.expected_receipt_date                 AS first_projected_delivery_date,
            oor.raw_roq                               AS raw_roq_immediate,
            0::float                                  AS off_cycle_raw_roq_immediate,
            0::float                                  AS raw_roq_order_cycle,
            oor.safety_stock,
            oor.elt_projected_bop                     AS bop_inv,
            al.is_expedite_order_resolved             AS is_resolved,
            paf.l0_name, paf.l1_name, paf.l2_name,
            paf.l1_name, paf.l2_name, paf.l3_name
        FROM oms.oms_orders_recommended oor
        INNER JOIN (
            SELECT article, loc_code,
                   BOOL_OR(is_expedite_order_resolved) AS is_expedite_order_resolved
            FROM oms.oms_alerts
            WHERE expedite_order = TRUE
            GROUP BY article, loc_code
        ) al ON al.article = oor.article AND al.loc_code = oor.loc_code
        INNER JOIN (
            SELECT product_code,
                   l0_name, l1_name, l2_name, l1_name, l2_name, l3_name
            FROM global.product_attributes_filter
            ' || v_pa_sql || '
        ) paf ON paf.product_code = oor.product_code
        LEFT JOIN oms.article_status_tag ast
            ON ast.product_code = oor.product_code AND ast.size = oor.size
        WHERE oor.order_gen_type != ''Manual''
          AND oor.order_type = ''Immediate'''
        || CASE WHEN start_date IS NOT NULL
                THEN ' AND oor.expected_receipt_date >= ''' || start_date::text || ''''
                ELSE '' END
        || CASE WHEN end_date IS NOT NULL
                THEN ' AND oor.expected_receipt_date <= ''' || end_date::text || ''''
                ELSE '' END;

    RAISE NOTICE 'off-cycle static SQL: %', v_sql;
    OPEN input_refcursor FOR EXECUTE v_sql;
    RETURN input_refcursor;
END;
$function$
;
