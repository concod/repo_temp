--liquibase formatted sql
--changeset adesh:details_metric_store_v4 runOnChange:true stripComments:false splitStatements:false context:MTP-133621 labels:MTP-133621
--comment: MTP-133621 dynamic KPI columns support with normalized name matching
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(refcursor, jsonb, jsonb, varchar, varchar, json, text, text);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(refcursor, jsonb, jsonb, varchar, varchar, json, text, text, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(input refcursor, store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, selected_columns json, order_by_column text, direction text, dynamic_kpi_config jsonb DEFAULT '[]'::jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _columns TEXT := '';
    _filter_query TEXT := '';
    _query_sa TEXT := '';
    _query_table_filters TEXT := '';
    _query_combine TEXT := '';
    _order_by_clause TEXT := '';
    -- Dynamic KPI variables
    _dynamic_kpi_columns TEXT := '';
    _kpi_rec RECORD;
BEGIN
    -- Convert selected columns JSON to CSV
    _columns := (
        SELECT string_agg(trim(both '"' from elem::text), ', ')
        FROM json_array_elements(selected_columns) AS elem
    );

    IF _columns IS NULL OR trim(_columns) = '' THEN
        RAISE EXCEPTION 'selected_columns cannot be empty.';
    END IF;

    -- Build dynamic KPI columns with regex transformation and location_type filtering
    -- Expected format: ["kpi_name_1", "kpi_name_2", ...] - array of KPI display names
    -- Only includes KPIs with location_type IN ('STORE', 'ALL') since this is a store-level view
    IF dynamic_kpi_config IS NOT NULL AND jsonb_array_length(dynamic_kpi_config) > 0 THEN
        FOR _kpi_rec IN 
            SELECT DISTINCT ON (regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g'))
                regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') AS column_name
            FROM inventory_smart.kpi_config kc
            JOIN inventory_smart.kpi_module_mapping kmm ON kc.kpi_id = kmm.kpi_id
            JOIN inventory_smart.module_component_mapping mcm ON kmm.module_component_id = mcm.mapping_id
            WHERE mcm.table_name ILIKE '%article_inventory_dashboard%'
              AND kc.is_active = TRUE
              AND COALESCE(kmm.location_type, 'STORE') IN ('STORE', 'ALL')
              AND (
                  regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (
                      SELECT attname
                      FROM pg_attribute a
                      JOIN pg_class c ON a.attrelid = c.oid
                      JOIN pg_namespace n ON c.relnamespace = n.oid
                      WHERE n.nspname = 'inventory_smart'
                        AND c.relname = regexp_replace(mcm.table_name, '_base$', '')
                        AND a.attnum > 0
                        AND NOT a.attisdropped
                  )
                  OR regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (
                      SELECT regexp_replace(lower(bkm.kpi_name), '[^a-z0-9]+', '_', 'g')
                      FROM inventory_smart.bq_kpi_mapping bkm
                      WHERE bkm.table_name = mcm.table_name
                  )
              )
              AND regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g') IN (SELECT jsonb_array_elements_text(dynamic_kpi_config))
            ORDER BY regexp_replace(lower(kc.kpi_name), '[^a-z0-9]+', '_', 'g')
        LOOP
            _dynamic_kpi_columns := _dynamic_kpi_columns || ', ' || quote_ident(_kpi_rec.column_name);
        END LOOP;
    END IF;
    RAISE NOTICE 'Dynamic KPI columns --> %', _dynamic_kpi_columns;

    -- Append dynamic KPI columns to selected columns
    _columns := _columns || _dynamic_kpi_columns;

    -- store attribute filters
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_table_filters := global.form_table_query(table_filters);

    -- WHERE clause
    _filter_query :=
        _query_sa ||
        CASE
            WHEN LENGTH(_query_sa) > 0 AND article <> '' AND metrics <> '' THEN
                format(' AND article = %L AND %I = 1', article, metrics)
            WHEN LENGTH(_query_sa) > 0 AND article <> '' THEN
                format(' AND article = %L', article)
            WHEN article <> '' AND metrics <> '' THEN
                format(' WHERE article = %L AND %I = 1', article, metrics)
            WHEN article <> '' THEN
                format(' WHERE article = %L', article)
            ELSE
                ''
        END;

    -- ORDER BY
    _order_by_clause := format('%I %s', order_by_column, direction);

    -- Build final query
    _query_combine := format($$
        WITH base_query AS (
            SELECT %s
            FROM inventory_smart.article_inventory_dashboard
            %s
            %s
        )
        SELECT * FROM base_query
        ORDER BY %s
    $$, _columns, _filter_query, _query_table_filters, _order_by_clause);

    RAISE NOTICE 'SQL: %', _query_combine;

    -- OPEN the given cursor name
    OPEN input FOR EXECUTE _query_combine;

    RETURN input;
END;
$function$
;