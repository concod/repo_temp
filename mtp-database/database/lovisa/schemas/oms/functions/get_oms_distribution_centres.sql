--liquibase formatted sql
--changeset nikhil.madhusudan:get_oms_distribution_centres_v6 runOnChange:true stripComments:false splitStatements:false
--comment: DC list via refcursor; p_join_source oor | oms_kpi | ooa (screen logic from app)
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_distribution_centres(refcursor, jsonb, boolean);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_distribution_centres(
    input refcursor,
    p_product_filter jsonb,
    p_join_source text DEFAULT 'oor'
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_pa_sql text := '';
    v_sql text;
    v_join text;
BEGIN
    v_pa_sql := inventory_smart.form_main_table_filters('ph_master', p_product_filter);
    v_pa_sql := REPLACE(v_pa_sql, 'article', 'l4_name');

    v_join := lower(trim(coalesce(p_join_source, 'oor')));
    IF v_join NOT IN ('oor', 'oms_kpi', 'ooa') THEN
        v_join := 'oor';
    END IF;

    IF v_join = 'oor' THEN
        v_sql := '
            SELECT DISTINCT dc.dc_code::varchar, dc.name::varchar, dc.linked_store_code::varchar
            FROM global.distribution_centres dc
            INNER JOIN inventory_smart.oms_orders_recommended oor ON dc.linked_store_code = oor.loc_code
            INNER JOIN global.product_attributes_filter paf ON oor.product_code = paf.l4_name
            ' || v_pa_sql || ' AND paf.ordering = ''Y'' AND paf.is_deleted = false
            AND dc.is_deleted = false AND dc.is_active = true
            ORDER BY dc.name';
    ELSIF v_join = 'oms_kpi' THEN
        v_sql := '
            SELECT DISTINCT dc.dc_code::varchar, dc.name::varchar, dc.linked_store_code::varchar
            FROM global.distribution_centres dc
            INNER JOIN inventory_smart.oms_kpi ok ON dc.linked_store_code = ok.loc_code
            INNER JOIN global.product_attributes_filter paf ON ok.product_code = paf.l4_name
            ' || v_pa_sql || ' AND paf.active = true AND paf.ordering = ''Y'' AND dc.is_deleted = false
            AND dc.is_deleted = false AND dc.is_active = true
            ORDER BY dc.name';
    ELSE
        v_sql := '
            SELECT DISTINCT dc.dc_code::varchar, dc.name::varchar, dc.linked_store_code::varchar
            FROM global.distribution_centres dc
            INNER JOIN inventory_smart.oms_orders_approved ooa ON dc.linked_store_code = ooa.loc_code
            INNER JOIN global.product_attributes_filter paf ON ooa.product_code = paf.l4_name
            ' || v_pa_sql || ' AND paf.ordering = ''Y'' AND paf.is_deleted = false
            AND (ooa.is_deleted IS NOT TRUE)
            AND dc.is_deleted = false AND dc.is_active = true
            ORDER BY dc.name';
    END IF;

    raise notice 'v_sql: %', v_sql;
    OPEN input FOR EXECUTE v_sql;
    RETURN input;
END
$function$;
