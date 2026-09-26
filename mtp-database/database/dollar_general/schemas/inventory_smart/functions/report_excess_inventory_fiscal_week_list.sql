--liquibase formatted sql
--changeset anirudh.singh:reporting_excess_inventory_fiscal_week_list runOnChange:true stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: COALESCE inventory_closing_balance with default value as 0 in reporting_excess_inventory_fiscal_week_list api
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.reporting_excess_inventory_fiscal_week_list(refcursor, jsonb, jsonb, jsonb, integer);

CREATE OR REPLACE FUNCTION inventory_smart.reporting_excess_inventory_fiscal_week_list(input refcursor, product_attributes jsonb, store_attributes jsonb, table_filters jsonb, fiscal_year_week integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare
    _query_pa text := '';
    _query_sa text := '';
    _query_pa_sa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _channel text := inventory_smart.get_channel_from_input(store_attributes);
    _cache_payload jsonb := jsonb_build_object('product_attributes', product_attributes, 'store_attributes', store_attributes, 'fiscal_year_week', fiscal_year_week);
    _cache_table_id text;
    _cache_schema text := 'inventory_smart';
    _cache_sp text := '.reporting_excess_inventory_fiscal_week_graph';
    _cache_key_pattern text := '{schema_name}:{sp_name}:{request}';
    _cache_dependencies text[] := '{inventory_smart.excess_units}';
begin
    raise notice '%', store_attributes->>'channel';
    product_attributes := product_attributes || jsonb_build_object('channel', _channel);
    _query_pa := inventory_smart.form_main_table_filters('ph_master', product_attributes);
    _query_sa := global.form_main_table_filters('store_attributes_filter', store_attributes);
    _query_pa_sa := _query_pa || 
                    (CASE WHEN LENGTH(_query_sa) > 0 THEN
                      ' AND ' || SUBSTRING(_query_sa, 8)
                     ELSE '' END);
    IF LENGTH(_query_pa_sa) = 0 THEN
      _query_pa_sa := ' WHERE TRUE';
    END IF;
    RAISE NOTICE 'combined product store attribute query --> %', _query_pa_sa;
    _query_table_filters := global.form_table_query(table_filters);
    RAISE NOTICE ' query filter table --> %', _query_table_filters;
    _query_combine := format($$ 
    SELECT
        CAST(SUBSTRING(CAST(fiscal_year_week AS text), 1, 4) AS integer) AS fiscal_year,
        CAST(SUBSTRING(CAST(fiscal_year_week AS text), 5, 2) AS integer) AS fiscal_week,
        psa_name,
        primary_sku,
        product_description,
        oh,
        it,
        oo,
        COALESCE(actual_sales, 0) AS unit_sold,
        ros,
        wos_threshold,
        wos,
        COALESCE(excess_inventory, 0) as excess_inv_sum,
        COALESCE(excess_inventory_cost, 0) as excess_inv_cost_sum,
        COALESCE(inventory_closing_balance, 0) as inventory_closing_balance
    FROM
        inventory_smart.excess_units
    %s AND fiscal_year_week = %L
$$, _query_pa_sa, fiscal_year_week);
    RAISE NOTICE 'Constructed SQL: -->  %', _query_combine;
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
