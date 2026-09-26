--liquibase formatted sql
--changeset anirudh.singh:reporting_excess_inventory_fiscal_week_graph runOnChange:true stripComments:false splitStatements:false context:Release_4_0 labels:liquibase_project_start
--comment:  COALESCE fields values with default value as 0 fetching aggregating sum for inventory_smart.excess_units | MTP-63828
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inventory_fiscal_week_graph(refcursor, jsonb, jsonb, jsonb, date, date);
CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inventory_fiscal_week_graph(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, _start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
    _query_pa text := '';
    _query_sa text := '';
    _query_pa_sa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _date_filter text := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
    _cache_payload jsonb := jsonb_build_object('product_attributes', product_attributes, 'store_attributes', store_attributes, 'start_date', _start_date, 'end_date', end_date);
    _cache_table_id text;
    _cache_schema text := 'inventory_smart';
    _cache_sp text := '.reporting_excess_inventory_fiscal_week_graph';
    _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies text[] := '{inventory_smart.excess_units}';
begin
    raise notice '%', store_attributes->>'channel';
    product_attributes := product_attributes || jsonb_build_object('channel', store_attributes->>'channel');
    _query_pa := inventory_smart.form_main_table_filters('ph_master', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa_sa := _query_pa || 
                    (CASE WHEN LENGTH(_query_sa) > 0 THEN
                      ' AND ' || SUBSTRING(_query_sa, 8)
                     ELSE '' END);
    IF _start_date IS NOT NULL AND end_date IS NOT NULL THEN
        _date_filter := format('WHERE date BETWEEN %L AND %L', _start_date, end_date);
    END IF;
    _query_pa_sa := _query_pa_sa ||
                    (CASE WHEN LENGTH(_query_pa_sa) > 0 AND LENGTH(_date_filter) > 0 THEN
                    ' AND ' || SUBSTRING(_date_filter, 6)
                    WHEN LENGTH(_query_pa_sa) > 0 THEN _date_filter
                    ELSE _date_filter END);
    raise notice 'combined product store attribute query --> %', _query_pa_sa; 
    _query_table_filters := global.form_table_query(table_filters);
    raise notice ' query filter table --> %', _query_table_filters;
    _query_combine := format($$
        SELECT
            CAST(SUBSTRING(CAST(fiscal_year_week AS text), 1, 4) AS integer) AS fiscal_year,
            CAST(SUBSTRING(CAST(fiscal_year_week AS text), 5, 2) AS integer) AS fiscal_week,
            SUM(COALESCE(excess_inventory, 0)) as excess_inv_sum,
            SUM(COALESCE(inventory_closing_balance, 0)) as tot_inv_sum,
            SUM(COALESCE(actual_sales, 0)) as unit_sold_sum,
            SUM(COALESCE(excess_inventory_cost, 0)) as excess_inv_cost_sum,
            SUM(coalesce(actual_sales_cost,0)) as actual_sales_cost,
            SUM(coalesce(inventory_closing_balance_cost,0)) as inventory_closing_balance_cost
                    FROM
            inventory_smart.excess_units
        %s
        GROUP BY
            fiscal_year_week
        ORDER BY
            fiscal_year_week
    $$, _query_pa_sa);
    raise notice 'Constructed SQL: -->  %', _query_combine;
    select
      * 
    from 
      cache.wrap_sp(
        _cache_schema,
        _cache_sp, 
        _cache_payload, 
        _query_combine, 
        _cache_dependencies, 
        _cache_key_pattern
      ) into _cache_table_id;
    perform set_config(
      'myvars.cache_table_id', _cache_table_id, 
      true
    );
    open input for execute 'select * from "cache"."' || _cache_table_id || '" X ' || _query_table_filters;
    RETURN input;
end
$function$
;