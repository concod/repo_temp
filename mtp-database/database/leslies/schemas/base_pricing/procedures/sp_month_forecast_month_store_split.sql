--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:sp_month_forecast_month_store_split_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_month_forecast_month_store_split_2

DROP PROCEDURE IF EXISTS base_pricing.sp_month_forecast_month_store_split;

CREATE OR REPLACE PROCEDURE base_pricing.sp_month_forecast_month_store_split(IN strategy_id integer, IN product_hierarchy_string text, IN monthly_start_date date, IN is_kvi text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    join_condition text;
    month_record RECORD;
    table_name text;
    segment_ids_text text;
BEGIN
    start_time := clock_timestamp();
    -- Get the table name
    IF is_kvi = 'true'
        THEN table_name := 'bp_simulation_store_split_ratio_kvi_month';
        ELSE table_name := 'bp_simulation_store_split_ratio_month';
    END IF;
    -- Get the list of non-nested segment_id
    EXECUTE format(
        '
            SELECT COALESCE(string_agg(DISTINCT segment_id::text, '',''), ''9999'')
            FROM base_pricing.%I
            WHERE segment_id <> 0;
        ',
        table_name
    ) INTO segment_ids_text;
    -- Declare the join condition for NON KVI combinations
    join_condition := array_to_string(
        ARRAY(
            SELECT format('bsssr.%1$s = bd.%1$s', trim(col))
            FROM unnest(string_to_array(product_hierarchy_string, ',')) AS col
        ),
        ' AND '
    );
    -- Create the temp table structure first
    EXECUTE format(
$query$
-- MAIN TABLE CREATION
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_month_store_split_%s_%s;
CREATE UNLOGGED TABLE base_pricing.unlogged_month_forecast_month_store_split_%s_%s (
    product_id integer,
    channel_id integer,
    segment_id integer,
    fiscal_month integer,
    fiscal_year integer,
    opt_level_bins text,
    cluster text,
    bin_split_ratio numeric,
    promo_source integer,
    weighted_promo_percent numeric,
    effective_reference_price numeric
);
$query$,
        strategy_id,
        is_kvi,
        strategy_id,
        is_kvi
    );
    -- Process each fiscal month separately
    FOR month_record IN
        EXECUTE format(
            'SELECT DISTINCT fiscal_month, fiscal_year
            FROM base_pricing.%I
            WHERE start_date >= $1
            ORDER BY fiscal_year, fiscal_month',
            table_name
        ) USING monthly_start_date
    LOOP
        RAISE NOTICE 'Processing fiscal_month % fiscal_year % for unlogged_month_forecast_month_store_split_%_%', month_record.fiscal_month, month_record.fiscal_year, strategy_id, is_kvi;
        sql_query := format(
$query$
-- INTERMEDIATE TABLE CREATION
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_month_store_split_intermediate_%s_%s;
CREATE UNLOGGED TABLE base_pricing.unlogged_month_forecast_month_store_split_intermediate_%s_%s AS
SELECT
    bd.product_id,
    bsssr.store_id,
    bsssr.channel_id,
    bd.segment_id,
    bd.opt_level_bins,
    bsssr.store_split_ratio
FROM
    base_pricing.unlogged_strategy_forecast_bins_data_%s_%s bd
    INNER JOIN (
        SELECT *
        FROM base_pricing.%s
        WHERE fiscal_month = %s
        AND fiscal_year = %s
    ) AS bsssr
        ON %s             -- JOIN Condition
        AND bd.store_id = bsssr.store_id
        AND (
            bd.segment_id = bsssr.segment_id
            OR (
                bd.segment_id NOT IN (%s)
                AND bsssr.segment_id NOT IN (%s)
            )
        );
-- INTERMEDIATE INDEX CREATION
CREATE INDEX IF NOT EXISTS idx_mo_fcast_split_int_%s_%s_id1
    ON base_pricing.unlogged_month_forecast_month_store_split_intermediate_%s_%s USING btree (product_id, store_id, segment_id);
$query$,
    -- INTERMEDIATE TABLE
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi,
    table_name,
    month_record.fiscal_month,
    month_record.fiscal_year,
    join_condition,
    segment_ids_text,
    segment_ids_text,
    -- INTERMEDIATE INDEX
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
        RAISE NOTICE 'Creating intermediate table unlogged_month_forecast_month_store_split_intermediate_%_% for fiscal_month % fiscal_year % - %', strategy_id, is_kvi, month_record.fiscal_month, month_record.fiscal_year, sql_query;
        EXECUTE sql_query;
        sql_query := format(
$query$
-- DATA INSERTION INTO MAIN TABLE
INSERT INTO base_pricing.unlogged_month_forecast_month_store_split_%s_%s
SELECT
    sfssi.product_id,
    sfssi.channel_id,
    sfssi.segment_id,
    %s AS fiscal_month,
    %s AS fiscal_year,
    sfssi.opt_level_bins,
    '' AS cluster,
    SUM(sfssi.store_split_ratio) as bin_split_ratio,
    MIN(bspm.promo_source) AS promo_source,
    AVG(bspm.weighted_promo_percent) AS weighted_promo_percent,
    AVG(bspm.effective_reference_price) AS effective_reference_price
FROM
    base_pricing.unlogged_month_forecast_month_store_split_intermediate_%s_%s sfssi
    LEFT JOIN (
        SELECT *
        FROM base_pricing.bp_simulation_promo_month
        WHERE fiscal_month = %s
        AND fiscal_year = %s
    ) AS bspm
        ON sfssi.product_id = bspm.product_id
        AND sfssi.channel_id = bspm.channel_id
        AND sfssi.segment_id = bspm.segment_id
GROUP BY
    sfssi.product_id,
    sfssi.channel_id,
    sfssi.segment_id,
    sfssi.opt_level_bins;
$query$,
    -- INSERT
    strategy_id,
    is_kvi,
    month_record.fiscal_month,
    month_record.fiscal_year,
    strategy_id,
    is_kvi,
    month_record.fiscal_month,
    month_record.fiscal_year
);
        RAISE NOTICE 'Inserting data into unlogged_month_forecast_month_store_split_%_% for fiscal_month % fiscal_year % - %', strategy_id, is_kvi, month_record.fiscal_month, month_record.fiscal_year, sql_query;
        EXECUTE sql_query;
    END LOOP;
    -- Create the index
    EXECUTE format(
$query$
CREATE INDEX IF NOT EXISTS idx_mo_fcast_split_%s_%s_id1
    ON base_pricing.unlogged_month_forecast_month_store_split_%s_%s USING btree (product_id, channel_id, segment_id, fiscal_month, fiscal_year);
$query$,
    strategy_id,
    is_kvi,
    strategy_id,
    is_kvi
);
    RAISE NOTICE 'Finished creating unlogged_month_forecast_month_store_split_%_% table', strategy_id, is_kvi;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for unlogged_month_forecast_month_store_split_%s_%s table : %', strategy_id, is_kvi, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_month_forecast_month_store_split - ' ||
                CASE WHEN is_kvi = 'true' THEN 'KVI' ELSE 'NON KVI' END,
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
