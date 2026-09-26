--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_strategy_actuals_main stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_strategy_actuals_main

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_strategy_actuals_main;


CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_strategy_actuals_main(strategy_id integer)
 RETURNS TABLE(product_id integer, store_id character varying, segment_id integer, actuals_sales_units bigint, actuals_revenue double precision, actuals_gross_margin_dollar double precision, actuals_gross_margin_percentage double precision, actuals_asp double precision, actuals_aum double precision)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    sql_query text;
BEGIN
    RAISE NOTICE 'STARTING Actuals data fetch';
    -- PROCEDURE CALLS
    -- STEP 1: Extract Transaction Data
    CALL base_pricing_restaurant.sp_strategy_actuals_transaction_data(strategy_id);
    -- STEP 2: Extract Zone Data
    CALL base_pricing_restaurant.sp_strategy_actuals_zone_data(strategy_id);
    -- Return the final joined result with weighted averages
    sql_query := format(
$query$
SELECT
    td.product_id,
    zd.effective_price_zone AS store_id,
    td.segment_id,
    SUM(td.sales_units)::int8 as actuals_sales_units,
    SUM(td.revenue) as actuals_revenue,
    SUM(td.gross_margin_dollar) as actuals_gross_margin_dollar,
    COALESCE(SUM(td.gross_margin_percentage * td.sales_units)
        / NULLIF(SUM(td.sales_units), 0))  as actuals_gross_margin_percentage,
    COALESCE(SUM(td.average_selling_price * td.sales_units)
        / NULLIF(SUM(td.sales_units), 0), 0) as actuals_asp,
    COALESCE(SUM(td.average_unit_margin * td.sales_units)
        / NULLIF(SUM(td.sales_units), 0), 0) as actuals_aum
FROM
    temp_transaction_data_%s td
    INNER JOIN temp_zone_data_%s zd
        ON td.product_id = zd.product_id
        AND td.store_id = zd.store_id
        AND td.segment_id = zd.segment_id
GROUP BY
    td.product_id,
    zd.effective_price_zone,
    td.segment_id;
$query$,
    strategy_id,
    strategy_id
);   
    RAISE NOTICE 'Executing : %', sql_query;
    RETURN QUERY EXECUTE sql_query;   
END;
$function$
;
