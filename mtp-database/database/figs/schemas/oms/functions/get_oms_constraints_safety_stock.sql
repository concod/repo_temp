--liquibase formatted sql
--changeset mssprakash.yashwanth@impactanalytics.co:get_oms_constraints_safety_stock_update_32 runOnChange:true stripComments:false splitStatements:false context:MTP-MTP-111977 labels:MTP-MTP-111977
--comment: removing x_article from the function
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(input refcursor, jsonb, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_safety_stock(jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_safety_stock(p_product_filter jsonb, p_meta jsonb)
RETURNS TABLE (
    hierarchy_info text,
    id integer,
    article varchar,
    loc_code varchar,
    style_name character varying,
    vendor_desc varchar,
    safety_stock_method varchar,
    stock_units integer,
    service_level_pct integer,
    safety_stock_twos integer,
    demand_twos integer,
    updated_by varchar,
    l0_name text,
    l1_name text,
    l2_name text,
    l3_name text,
    product_lifecycle text,
    product_code text,
    updated_at timestamptz,
    is_wos_demand_disabled boolean
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql                        text := '';
    v_constraints_safety_stocks_sql text := '';
    v_meta_cls                      text := '';
    v_gen_random_uuid               text := gen_random_uuid()::varchar;
BEGIN
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', p_product_filter);

    IF p_meta <> '{}' THEN
        v_meta_cls := global.form_table_query(p_meta);
    END IF;

    v_constraints_safety_stocks_sql := '
        SELECT
            ''-'' as hierarchy_info,
            X.*,
            CASE
                WHEN ocop.order_strategy NOT IN (''Week of Supply'', ''Weeks of Supply'', ''Target WOS'')
                THEN TRUE
                ELSE FALSE
            END AS is_wos_demand_disabled
        FROM (
            SELECT
                ocss.id,
                ocss.article,
                ocss.loc_code,
                paf.style_name,
                paf.vendor_desc,
                ocss.safety_stock_method,
                ocss.stock_units,
                ocss.service_level_pct,
                ocss.safety_stock_twos,
                ocss.demand_twos,
                u1.name as updated_by,
                MAX(paf.l0_name) AS l0_name,
                MAX(paf.l1_name) AS l1_name,
                MAX(paf.l2_name) AS l2_name,
                MAX(paf.l3_name) AS l3_name,
                MAX(paf.product_lifecycle) AS product_lifecycle,
                MAX(paf.product_code) AS product_code,
                MAX(ocss.updated_at) as updated_at
            FROM
                inventory_smart.oms_constraints_safety_stock ocss
            LEFT JOIN
                global.user_master u1 ON u1.user_code = ocss.updated_by::int
            INNER JOIN
                global.product_attributes_filter paf ON ocss.article = paf.article
            INNER JOIN
                global.distribution_centres dc ON ocss.loc_code = dc.linked_store_code
                AND NOT dc.is_deleted
                AND paf.active AND paf.ordering = ''Y''
            ' || v_pa_sql || '
            GROUP BY
                1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11
        ) X
        LEFT JOIN (
            SELECT
                article AS ocop_article,
                MAX(order_strategy) AS order_strategy
            FROM
                inventory_smart.oms_constraints_order_policy
            GROUP BY
                article
        ) ocop ON article = ocop.ocop_article
        ' || v_meta_cls;

    RAISE NOTICE 'v_constraints_safety_stocks_sql %', v_constraints_safety_stocks_sql;
    RETURN QUERY EXECUTE v_constraints_safety_stocks_sql;
END
$function$;
