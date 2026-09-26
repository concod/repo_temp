--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_day_split_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_day_split_1

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_day_split;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_day_split(IN strategy_id integer, IN product_hierarchy_string text, IN strategy_start_date date, IN strategy_end_date date, IN is_kvi text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    join_condition text;
    table_name text := '';
    segment_ids_text text := '9999';
BEGIN
    start_time := clock_timestamp();
    -- Get the table name
    IF is_kvi = 'true'
        THEN table_name := 'bp_simulation_day_split_ratio_kvi';
        ELSE table_name := 'bp_simulation_day_split_ratio';
    END IF;
    -- Get the list of non-nested segment_id
    EXECUTE format(
        '
            SELECT string_agg(DISTINCT segment_id::text, '','')
            FROM base_pricing_restaurant.%I
            WHERE segment_id <> 0;
        ',
        table_name
    ) INTO segment_ids_text;
    -- Declare the join condition for NON KVI combinations
    join_condition := array_to_string(
        ARRAY(
            SELECT format('pcs.%1$s = bsdsr.%1$s', trim(col))
            FROM unnest(string_to_array(product_hierarchy_string, ',')) AS col
        ),
        ' AND '
    );
    sql_query := format(
$query$
-- TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_day_split_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_day_split_%s_%s AS
SELECT
    pcs.product_id,
    pcs.channel_id,
    pcs.segment_id,
    bsdsr.week_start_date,
    SUM(bsdsr.day_split_ratio) AS week_split_ratio
FROM
    base_pricing_restaurant.temp_monthly_metrics_pcs_filter_%s_%s pcs
    INNER JOIN (
        SELECT *
        FROM base_pricing_restaurant.%s
        WHERE date BETWEEN '%s' AND '%s'
    ) AS bsdsr
        ON %s      -- JOIN Condition
        AND pcs.channel_id = bsdsr.channel_id
        AND (
            pcs.segment_id = bsdsr.segment_id
            OR (
                pcs.segment_id NOT IN (%s)
                AND bsdsr.segment_id NOT IN (%s)
            )
        )
GROUP BY
    pcs.product_id,
    pcs.channel_id,
    pcs.segment_id,
    bsdsr.week_start_date;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_day_split_%s_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_day_split_%s_%s USING btree (product_id, channel_id, segment_id, week_start_date);
$query$,
    -- TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    table_name,
    strategy_start_date,
    strategy_end_date,
    join_condition,
    segment_ids_text,
    segment_ids_text,
    -- INDEX
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
    -- Execute the table creation
    RAISE NOTICE 'Creating temp_monthly_metrics_day_split_%_% tables : %', strategy_id, is_kvi, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_day_split_%_% tables : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_day_split - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
