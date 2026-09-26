--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_store_split stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_store_split

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_store_split;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_store_split(IN strategy_id integer, IN product_hierarchy_string character varying, IN strategy_start_date date, IN strategy_end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    temp_strategy_store_split_query TEXT;
BEGIN
    start_time := clock_timestamp();
    temp_strategy_store_split_query := format(
$query$
DROP TABLE IF EXISTS temp_strategy_store_split_%s;
CREATE UNLOGGED TABLE temp_strategy_store_split_%s AS
WITH
    sd AS (
        SELECT
            pcs.product_id,
            pcs.channel_id,
            pcs.segment_id,
            pcs.store_id,
            bpsam.price_zone
        FROM
            base_pricing.bp_unlogged_combinations_%s_false pcs
            INNER JOIN base_pricing.bp_product_store_attributes_mapping_v4 bpsam
                USING (product_id, store_id, segment_id)
    ),
    sd_kvi AS (
        SELECT
            pcs.product_id,
            %s
            pcs.channel_id,
            pcs.segment_id,
            pcs.store_id,
            bpsam.price_zone
        FROM
            base_pricing.bp_unlogged_combinations_%s_true pcs
            INNER JOIN base_pricing.bp_product_store_attributes_mapping_v4 bpsam
                USING (product_id, store_id, segment_id)
    ),
    ssr_kvi AS (
        SELECT
            bsssr.product_id,
            bsssr.channel_id,
            bsssr.segment_id,
            bsssr.price_zone,
            bsssr.week_start_date,
            SUM(store_split_ratio) AS store_split_ratio
        FROM (
                SELECT *
                FROM
                    base_pricing.bp_simulation_store_split_ratio_kvi
                WHERE
                    week_start_date BETWEEN '%s' AND '%s'
            ) AS bsssr
            INNER JOIN sd_kvi
                USING(product_id, store_id, segment_id)
        GROUP BY
            bsssr.product_id,
            bsssr.channel_id,
            bsssr.segment_id,
            bsssr.price_zone,
            bsssr.week_start_date
    ),
    ssr AS (
        SELECT
            bsssr.product_id,
            bsssr.channel_id,
            bsssr.segment_id,
            bsssr.price_zone,
            bsssr.week_start_date,
            SUM(store_split_ratio) AS store_split_ratio
        FROM (
                SELECT *
                FROM
                    base_pricing.bp_simulation_store_split_ratio_kvi
                WHERE
                    week_start_date BETWEEN '%s' AND '%s'
            ) AS bsssr
            INNER JOIN sd
                USING(%s store_id, segment_id)
        GROUP BY
            bsssr.product_id,
            bsssr.channel_id,
            bsssr.segment_id
            bsssr.price_zone,
            bsssr.week_start_date
    )
SELECT
    ssd.product_id,
    ssd.channel_id,
    ssd.segment_id
    ssd.price_zone,
    ssd.week_start_date
    SUM(ssd.store_split_ratio) as store_split_ratio
FROM (
    ssr
    UNION ALL
    ssr_kvi
) as ssd
;
    $query$,
    strategy_id,
    strategy_id,
    strategy_id,
    product_hierarchy_string,
    strategy_id,
    strategy_start_date,
    strategy_end_date,
    strategy_start_date,
    strategy_end_date,
    product_hierarchy_string
    );
    RAISE NOTICE 'Creating temp_strategy_store_split table: %', temp_strategy_store_split_query;
    EXECUTE temp_strategy_store_split_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken temp_strategy_store_split table : %', end_time - start_time;
END;
$procedure$
;
