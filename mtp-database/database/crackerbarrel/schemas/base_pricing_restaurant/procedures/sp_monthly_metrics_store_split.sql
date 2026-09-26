--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_store_split_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_store_split_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_store_split;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_store_split(IN strategy_id integer, IN product_hierarchy_string text, IN strategy_min_week_start_date date, IN strategy_max_week_start_date date, IN is_kvi text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    join_condition text;
    week_date date;
    table_name text;
    segment_ids_text text;
BEGIN
    start_time := clock_timestamp();
    -- Get the table name
    IF is_kvi = 'true'
        THEN table_name := 'bp_simulation_store_split_ratio_kvi';
        ELSE table_name := 'bp_simulation_store_split_ratio';
    END IF;
    -- Get the list of non-nested segment_id
    EXECUTE format(
        '
            SELECT COALESCE(string_agg(DISTINCT segment_id::text, '',''), ''9999'')
            FROM base_pricing_restaurant.%I
            WHERE segment_id <> 0;
        ',
        table_name
    ) INTO segment_ids_text;
    -- Declare the join condition for NON KVI combinations
    join_condition := array_to_string(
        ARRAY(
            SELECT format('pss.%1$s = bsssr.%1$s', trim(col))
            FROM unnest(string_to_array(product_hierarchy_string, ',')) AS col
        ),
        ' AND '
    );
    -- Create the temp table structure first
    EXECUTE format(
$query$
-- MAIN TABLE CREATION
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_store_split_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_store_split_%s_%s (
    product_id integer,
    channel_id integer,
    segment_id integer,
    week_start_date date,
    effective_price_zone text,
    opt_level_bins text,
    bin_split_ratio numeric
);
$query$,
        strategy_id,
        is_kvi,
        strategy_id,
        is_kvi
    );
    -- Process each week separately
    FOR week_date IN 
        EXECUTE format(
            'SELECT DISTINCT week_start_date
            FROM base_pricing_restaurant.%I
            WHERE week_start_date BETWEEN $1 AND $2
            ORDER BY week_start_date',
            table_name
        ) USING strategy_min_week_start_date, strategy_max_week_start_date
    LOOP
        RAISE NOTICE 'Processing week % for temp_monthly_metrics_store_split_%_%', week_date, strategy_id, is_kvi;
        sql_query := format(
$query$
-- INTERMEDIATE TABLE CREATION
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_store_split_intermediate_%s_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_store_split_intermediate_%s_%s AS
SELECT
    pss.product_id,
    pss.store_id,
    pss.channel_id,
    pss.segment_id,
    pss.effective_price_zone,
    pss.opt_level_bins,
    bsssr.store_split_ratio
FROM
    base_pricing_restaurant.temp_monthly_metrics_pss_filter_%s_%s pss
    INNER JOIN (
        SELECT *
        FROM base_pricing_restaurant.%s
        WHERE week_start_date = '%s'      -- Single week only
    ) AS bsssr
        ON %s             -- JOIN Condition
        AND pss.store_id = bsssr.store_id
        AND (
            pss.segment_id = bsssr.segment_id
            OR (
                pss.segment_id NOT IN (%s)
                AND bsssr.segment_id NOT IN (%s)
            )
        );
-- INTERMEDIATE INDEX CREATION
CREATE INDEX idx_temp_monthly_metrics_store_split_intermediate_%s_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_store_split_intermediate_%s_%s USING btree (product_id, store_id, segment_id);
$query$,
    -- INTERMEDIATE TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    table_name,
    week_date,
    join_condition,
    segment_ids_text,
    segment_ids_text,
    -- INTERMEDIATE INDEX
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
        RAISE NOTICE 'Creating intermediate table temp_monthly_metrics_store_split_intermediate_%_% for week % - %', strategy_id, is_kvi, week_date, sql_query;
        EXECUTE sql_query;
        sql_query := format(
$query$
-- DATA INSERTION INTO MAIN TABLE
INSERT INTO base_pricing_restaurant.temp_monthly_metrics_store_split_%s_%s
SELECT
    sfssi.product_id,
    sfssi.channel_id,
    sfssi.segment_id,
    '%s'::date AS week_start_date,
    sfssi.effective_price_zone,
    sfssi.opt_level_bins,
    SUM(sfssi.store_split_ratio) as bin_split_ratio
FROM
    base_pricing_restaurant.temp_monthly_metrics_store_split_intermediate_%s_%s sfssi
GROUP BY
    sfssi.product_id,
    sfssi.channel_id,
    sfssi.segment_id,
    sfssi.effective_price_zone,
    sfssi.opt_level_bins;
$query$,
    -- INSERT
    strategy_id,
    is_kvi,
    week_date,
    strategy_id,
    is_kvi
);
        RAISE NOTICE 'Inserting data into temp_monthly_metrics_store_split_%_% for week % - %', strategy_id, is_kvi, week_date, sql_query;
        EXECUTE sql_query;
    END LOOP;
    -- Create the index
    EXECUTE format(
$query$
CREATE INDEX idx_temp_monthly_metrics_store_split_%s_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_store_split_%s_%s USING btree (product_id, channel_id, segment_id, week_start_date);
$query$,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
    RAISE NOTICE 'Finished creating temp_monthly_metrics_store_split_%_% table', strategy_id, is_kvi;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_store_split_%s_%s table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_store_split - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;