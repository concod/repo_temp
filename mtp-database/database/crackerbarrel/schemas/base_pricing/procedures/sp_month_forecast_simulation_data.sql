--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:sp_month_forecast_simulation_data_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_month_forecast_simulation_data_1

DROP PROCEDURE IF EXISTS base_pricing.sp_month_forecast_simulation_data;

CREATE OR REPLACE PROCEDURE base_pricing.sp_month_forecast_simulation_data(IN strategy_id integer, IN monthly_start_date text, IN is_kvi text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_simulation_data_%s_%s;
CREATE UNLOGGED TABLE base_pricing.unlogged_month_forecast_simulation_data_%s_%s AS
SELECT
    pcs.product_id,
    pcs.channel_id,
    pcs.segment_id,
    bsm.fiscal_month,
    bsm.fiscal_month_name,
    bsm.fiscal_year,
    bsm.start_date,
    bsm.end_date,
    bsm.min_cost,
    bsm.base_percentage,
    bsm.price_point,
    bsm.sales_units,
    bsm.elasticity_bp,
    bsm.promo_elasticity,
    bspm.promo_source,
    bspm.weighted_promo_percent,
    bspm.effective_reference_price
FROM
    base_pricing.unlogged_strategy_forecast_pcs_filter_%s_%s pcs
    INNER JOIN (
        SELECT *
        FROM base_pricing.bp_simulation_month
        WHERE start_date >= '%s'
    ) AS bsm
        ON bsm.product_id = pcs.product_id
        AND bsm.channel_id = pcs.channel_id
        AND bsm.segment_id = pcs.segment_id
    LEFT JOIN (
        SELECT *
        FROM base_pricing.bp_simulation_promo_month
        WHERE start_date >= '%s'
    ) AS bspm
        ON bsm.product_id = bspm.product_id
        AND bsm.channel_id = bspm.channel_id
        AND bsm.segment_id = bspm.segment_id
        AND bsm.fiscal_month = bspm.fiscal_month
        AND bsm.fiscal_year = bspm.fiscal_year;
-- INDEX creation
CREATE INDEX idx_unlogged_month_forecast_simulation_data_%s_%s_id1
    ON base_pricing.unlogged_month_forecast_simulation_data_%s_%s USING btree (product_id, channel_id, segment_id, fiscal_month, fiscal_year);
$query$,
    -- TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    monthly_start_date,
    monthly_start_date,
    -- INDEX
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
    -- Execute the table creation
    RAISE NOTICE 'Creating unlogged_month_forecast_simulation_data_%_% table: %', strategy_id, is_kvi, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for unlogged_month_forecast_simulation_data_%_% table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_month_forecast_simulation_data - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
