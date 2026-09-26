--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_day_split stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_day_split

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_day_split;


CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_day_split(IN strategy_id integer, IN product_hierarchy_string character varying, IN strategy_start_date date, IN strategy_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    temp_strategy_daysplit_query TEXT;
BEGIN
    start_time := clock_timestamp();
    temp_strategy_daysplit_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS temp_strategy_day_split_%s;
CREATE UNLOGGED TABLE temp_strategy_day_split_%s AS
WITH
    dsr_kvi AS (
        SELECT
            pcs.product_id,
            pcs.channel_id,
            pcs.segment_id,
            bsdsr.week_start_date,
            SUM(bsdsr.day_split_ratio) AS week_split_ratio
        FROM
            base_pricing.bp_simulation_day_split_ratio_kvi bsdsr
            INNER JOIN base_pricing.strategy_pcs_filter_%s pcs
                USING (product_id, channel_id, segment_id)
        WHERE
            bsdsr.date BETWEEN '%s' AND '%s'
        GROUP BY
            pcs.product_id,
            pcs.channel_id,
            pcs.segment_id,
            bsdsr.week_start_date
    ),
    dsr AS (
        SELECT
            pcs.product_id,
            pcs.channel_id,
            pcs.segment_id,
            bsdsr.week_start_date,
            SUM(bsdsr.day_split_ratio) AS week_split_ratio
        FROM
            base_pricing.bp_simulation_day_split_ratio bsdsr
            INNER JOIN base_pricing.strategy_pcs_filter_%s pcs
                USING (%s channel_id, segment_id)
        WHERE
            bsdsr.date BETWEEN '%s' AND '%s'
        GROUP BY
            pcs.product_id,
            pcs.channel_id,
            pcs.segment_id,
            bsdsr.week_start_date
    )
SELECT
    COALESCE(dsr_kvi.product_id, dsr.product_id) AS product_id,
    COALESCE(dsr_kvi.channel_id, dsr.channel_id) AS channel_id,
    COALESCE(dsr_kvi.segment_id, dsr.segment_id) AS segment_id,
    COALESCE(dsr_kvi.week_start_date, dsr.week_start_date) AS week_start_date,
    COALESCE(dsr_kvi.week_split_ratio, dsr.week_split_ratio, 0) AS week_split_ratio
FROM
    dsr_kvi
    FULL OUTER JOIN dsr
        USING(product_id, channel_id, segment_id, week_start_date)
;
$query$,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_start_date,
    strategy_end_date,
    strategy_id,
    product_hierarchy_string,
    strategy_start_date,
    strategy_end_date,
    strategy_start_date,
    strategy_end_date
    );
    -- Execute the table creation
    RAISE NOTICE 'Creating temp_strategy_daysplit table: %', temp_strategy_daysplit_query;
    EXECUTE temp_strategy_daysplit_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken temp_strategy_daysplit table : %', end_time - start_time;
END;
$procedure$
;