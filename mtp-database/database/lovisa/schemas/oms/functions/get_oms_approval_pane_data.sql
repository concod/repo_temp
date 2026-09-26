--liquibase formatted sql
--changeset nikhil.dhoot:get_oms_approval_pane_data_update_2 runOnChange:true stripComments:false splitStatements:false context:MTP-95046 labels:MTP-95046_1 
--comment: Fn to fetch approval pane data with dynamic SELECT and WHERE clauses; join distribution_centres for dc name
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_approval_pane_data(refcursor, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_approval_pane_data(
    p_cursor refcursor,
    p_select_clause text,  -- dynamic SELECT columns
    p_where_clause  text   -- dynamic WHERE clause (optional)
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
DECLARE
    v_query text;
    v_select_clause text;
    v_where_clause text;
BEGIN
    RAISE NOTICE 'Executing approval pane data query: SELECT=% WHERE=%', p_select_clause, p_where_clause;

    -- Map API-facing dc_name to actual source column while keeping response alias.
    v_select_clause := regexp_replace(p_select_clause, '\mdc_name\M', 'dc.name AS dc_name', 'gi');
    v_where_clause := regexp_replace(coalesce(p_where_clause, ''), '\mdc_name\M', 'dc.name', 'gi');

    -- Build query dynamically
    v_query := format(
        'SELECT DISTINCT %s, paf.*
         FROM inventory_smart.oms_orders_recommended oor
         JOIN global.product_attributes_filter paf
             ON oor.article = paf.l4_name
         INNER JOIN global.distribution_centres dc
             ON dc.linked_store_code = oor.loc_code
             AND dc.is_active
             AND NOT dc.is_deleted
         %s',
        v_select_clause,
        v_where_clause
    );

    RAISE NOTICE 'Final SQL Query: %', v_query;

    -- Execute query
    OPEN p_cursor FOR EXECUTE v_query;

    RETURN p_cursor;
END
$function$;