--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:details_metric_store runOnChange:true stripComments:false splitStatements:false context:details_metric_store labels:details_metric_store
--comment: details_metric_store - intial sync version, updated to accomodate store filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(input jsonb, character varying, character varying, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.details_metric_store(refcursor, jsonb, jsonb, varchar, varchar, json, text, text);
CREATE OR REPLACE FUNCTION inventory_smart.details_metric_store(input refcursor, store_attributes jsonb, table_filters jsonb, article character varying, metrics character varying, selected_columns json, order_by_column text, direction text)
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
BEGIN
    -- Convert selected columns JSON to CSV
    _columns := (
        SELECT string_agg(trim(both '"' from elem::text), ', ')
        FROM json_array_elements(selected_columns) AS elem
    );

    IF _columns IS NULL OR trim(_columns) = '' THEN
        RAISE EXCEPTION 'selected_columns cannot be empty.';
    END IF;

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
            FROM inventory_smart.article_inventory_dashboard aid
		    join global.store_attributes_filter saf using(store_code, store_name)
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