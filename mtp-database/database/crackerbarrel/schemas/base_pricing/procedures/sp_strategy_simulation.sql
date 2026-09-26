--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_simulation stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_simulation

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_simulation;


CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_simulation(IN strategy_id integer, IN max_week_start_date date, IN max_week_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    temp_strategy_sim_query TEXT;
BEGIN
    start_time := clock_timestamp();
    temp_strategy_sim_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS temp_strategy_simulation_%s;
CREATE UNLOGGED TABLE temp_strategy_simulation_%s AS
SELECT
    pcsf.product_id,
    pcsf.channel_id,
    pcsf.segment_id,
    week_start_date,
    bsw.min_cost,
    bsw.base_percentage,
    bsw.price_point,
    bsw.sales_units as pc_forecast,
    bsw.elasticity_bp,
    bsw.promo_elasticity,
    bsw.confidence,
    COALESCE(bspw.weighted_promo_percent, 0.0) as weighted_promo_percent,
    COALESCE(bspw.promo_source, 0) as promo_source,
    COALESCE(bspw.reference_price, 0) as reference_price,
    COALESCE(bspw.effective_reference_price, 0) as effective_reference_price
FROM
    base_pricing.strategy_pcs_filter_%s as pcsf
    INNER JOIN base_pricing.bp_simulation_week bsw
        USING (product_id, channel_id, segment_id)
    LEFT JOIN base_pricing.bp_simulation_promo_week bspw
        USING (product_id, channel_id, segment_id, week_start_date)
    WHERE
        bsw.week_start_date between '%s' and '%s'
;
$query$,
    strategy_id,
    strategy_id,
    strategy_id,
    max_week_start_date,
    max_week_end_date
    );
    -- Execute the table creation
    RAISE NOTICE 'Creating temp_strategy_sim table: %', temp_strategy_sim_query;
    EXECUTE temp_strategy_sim_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken temp_strategy_sim table : %', end_time - start_time;
END;
$procedure$
;
