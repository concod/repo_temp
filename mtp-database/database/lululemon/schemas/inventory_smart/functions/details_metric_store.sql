--liquibase formatted sql
--changeset adesh:details_metric_store runOnChange:true stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243 add kpi_names parameter support
--rollback: SELECT 1

DROP FUNCTION IF EXISTS  inventory_smart.details_metric_store(jsonb, jsonb, varchar, varchar);
DROP FUNCTION IF EXISTS  inventory_smart.details_metric_store(jsonb, jsonb, varchar, varchar, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(
    input jsonb,
    filters jsonb,
    article character varying,
    metric character varying,
    kpi_names jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE(
    store_code character varying,
    store_name character varying,
    store_oh integer,
    store_it integer,
    wos_oh_oo_it integer,
    lw_sales_units integer,
    wtd_sales_units integer,
    wtd_revenue integer,
    lw_revenue real
)
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_sa TEXT := '';
    _query_table_filters TEXT := '';
    _filter_query TEXT := '';
    _query_combine TEXT := '';
BEGIN
    RAISE NOTICE 'kpi_names --> %', kpi_names;

    _query_sa := global.form_main_table_filters('store_attributes_filter', input);
    _query_table_filters := global.form_table_query(filters);

    -- Build filter
  _filter_query := _query_sa ||
        CASE
            WHEN LENGTH(_query_sa) > 0 AND article <> '' AND metric <> '' THEN
                format(' AND article = %L AND %I = 1', article, metric)
            WHEN LENGTH(_query_sa) > 0 AND article <> '' THEN
                format(' AND article = %L', article)
            WHEN article <> '' AND metric <> '' THEN
                format(' WHERE article = %L AND %I = 1', article, metric)
            WHEN article <> '' THEN
                format(' WHERE article = %L', article)
            ELSE
                ''
        END;

    -- Build main query
    _query_combine := format($sql$
        WITH base_query AS (
            SELECT 
                store_code,
                store_name,
                store_oh,
                store_it,
                wos_oh_oo_it,
                lw_sales_units,
                lw_revenue,
                wtd_sales_units,
                wtd_revenue
            FROM inventory_smart.article_inventory_dashboard
            %s
        )
        SELECT 
            store_code::varchar AS store_code,
            store_name::varchar AS store_name,
            store_oh::integer AS store_oh,
            store_it::integer AS store_it,
            wos_oh_oo_it::integer AS wos_oh_oo_it,
            lw_sales_units::integer AS lw_sales_units,
            wtd_sales_units::integer AS wtd_sales_units,
            wtd_revenue::integer AS wtd_revenue,
            lw_revenue::real AS lw_revenue
        FROM base_query
        ORDER BY lw_sales_units DESC
    $sql$, _filter_query);

    RAISE NOTICE '%', _query_combine || ' ' || _query_table_filters;

    RETURN QUERY EXECUTE _query_combine || ' ' || _query_table_filters;
END
$function$;
