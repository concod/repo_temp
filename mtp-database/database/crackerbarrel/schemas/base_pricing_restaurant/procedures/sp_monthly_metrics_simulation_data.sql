--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_simulation_data_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_simulation_data_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_simulation_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_simulation_data(IN strategy_id integer, IN strategy_min_week_start_date date, IN strategy_max_week_start_date date, IN is_kvi text)
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
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_simulation_data_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_simulation_data_%s_%s AS
SELECT
    pcs.product_id,
    pcs.channel_id,
    pcs.segment_id,
    bsw.week_start_date,
    bsw.min_cost,
    bsw.base_percentage,
    bsw.price_point,
    bsw.sales_units,
    bsw.elasticity_bp,
    bsw.promo_elasticity
FROM 
    base_pricing_restaurant.temp_monthly_metrics_pcs_filter_%s_%s pcs
    INNER JOIN (
        SELECT *
        FROM base_pricing_restaurant.bp_simulation_week
        WHERE week_start_date between '%s' and '%s'
    ) AS bsw
        ON bsw.product_id = pcs.product_id
        AND bsw.channel_id = pcs.channel_id
        AND bsw.segment_id = pcs.segment_id;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_simulation_data_%s_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_simulation_data_%s_%s USING btree (product_id, channel_id, segment_id, week_start_date);
$query$,
    -- TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_min_week_start_date,
    strategy_max_week_start_date,
    -- INDEX
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
    -- Execute the table creation
    RAISE NOTICE 'Creating temp_monthly_metrics_simulation_data_%_% table: %', strategy_id, is_kvi, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_simulation_data_%_% table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_simulation_data - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
