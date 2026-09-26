--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_strategy_actuals_transaction_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for sp_strategy_actuals_transaction_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_actuals_transaction_data;


CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_actuals_transaction_data(IN var_strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    start_date date;
    end_date date;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    -- Get date range
    SELECT bsm.start_date, bsm.end_date
    INTO start_date, end_date
    FROM base_pricing_restaurant.bp_strategy_master bsm
    WHERE bsm.strategy_id = var_strategy_id;
    -- Create temp transaction table
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS temp_transaction_data_%s;
CREATE TEMP TABLE temp_transaction_data_%s AS
SELECT
    td.product_id,
    td.store_id,
    td.segment_id,
    SUM(td.sales_units) as sales_units,
    SUM(td.total_revenue) as revenue,
    SUM(td.total_margin) as gross_margin_dollar,
    COALESCE(SUM(td.total_margin)
        / NULLIF(SUM(td.total_revenue), 0)) * 100  as gross_margin_percentage,
    COALESCE(SUM(td.total_revenue)
        / NULLIF(SUM(td.sales_units), 0), 0) as average_selling_price,
    COALESCE(SUM(td.total_margin)
        / NULLIF(SUM(td.sales_units), 0), 0) as average_unit_margin
FROM
    base_pricing_restaurant.bp_transaction_data_daily td
WHERE
    td.transaction_date BETWEEN '%s' AND '%s'
GROUP BY
    td.product_id,
    td.store_id,
    td.segment_id;
-- INDEX creation
CREATE INDEX idx_temp_transaction_data_%s_id1
    ON temp_transaction_data_%s USING btree (product_id, store_id, segment_id);
$query$,
    var_strategy_id,
    var_strategy_id,
    start_date,
    end_date,
    var_strategy_id,
    var_strategy_id
);
RAISE NOTICE 'Executing: %', sql_query;
EXECUTE sql_query;
RAISE NOTICE 'Creating temp_transaction_data table: %', sql_query;
EXECUTE sql_query;
end_time := clock_timestamp();
RAISE NOTICE 'Time taken for temp_transaction_data table : %', end_time - start_time;
-- TIME tracking
INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
    (strategy_id, procedure, start_date, end_date, time_taken)
VALUES
    (var_strategy_id, 'sp_strategy_actuals_transaction_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;
