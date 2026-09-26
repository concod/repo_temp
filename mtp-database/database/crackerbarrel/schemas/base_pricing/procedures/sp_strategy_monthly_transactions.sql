--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:sp_strategy_monthly_transactions_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_monthly_transactions_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_monthly_transactions;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_monthly_transactions(
    p_strategy_id       INTEGER,
    p_batch_size        INTEGER DEFAULT 200,  -- opt_level_bins per UPDATE batch
    p_fiscal_year       INTEGER DEFAULT NULL,
    p_fiscal_month      INTEGER DEFAULT NULL
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    start_time              TIMESTAMP;
    end_time                TIMESTAMP;
    rows_updated            BIGINT        := 0;
    batch_rows              BIGINT;
    inserted_rows           BIGINT        := 0;
    total_inserted          BIGINT        := 0;
    price_lock_col          TEXT;
    zone_exception_col      TEXT;
    unlogged_table          TEXT;
    date_min                DATE;
    date_max                DATE;
    rec_month               RECORD;

    -- batch UPDATE cursor state
    bins_offset             INTEGER       := 0;
    bins_batch              TEXT[];
    bins_list               TEXT;
    sql_ddl                 TEXT;
    sql_insert              TEXT;
    sql_update              TEXT;
    sql_bins_page           TEXT;
BEGIN
    start_time := clock_timestamp();

    -- ----------------------------------------------------------
    -- 1. Resolve dynamic attribute column names
    -- ----------------------------------------------------------
    SELECT MAX(database_column) INTO price_lock_col
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE attribute_name = 'price_lock';

    SELECT MAX(database_column) INTO zone_exception_col
    FROM base_pricing.bp_product_store_attributes_metadata
    WHERE attribute_name = 'zone_exception';

    -- ----------------------------------------------------------
    -- 2. Derive transaction date window from bp_monthly_forecast
    --    Use the strategy's forecast horizon so we only pull
    --    historical months that are actually relevant.
    -- ----------------------------------------------------------
    SELECT
        MIN(start_date),
        MAX(end_date)
    INTO date_min, date_max
    FROM base_pricing.bp_monthly_forecast
    WHERE strategy_id = p_strategy_id
      AND (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
      AND (p_fiscal_month IS NULL OR fiscal_month = p_fiscal_month);

    IF date_min IS NULL THEN
        RAISE NOTICE 'No bp_monthly_forecast rows found for strategy_id=%. Aborting.', p_strategy_id;
        RETURN;
    END IF;

    RAISE NOTICE 'Date window for strategy_id=%: % to %', p_strategy_id, date_min, date_max;

    -- ----------------------------------------------------------
    -- 3. Create UNLOGGED staging table (schema only first,
    --    then batch-INSERT data to avoid one giant CTAS lock)
    -- ----------------------------------------------------------
    unlogged_table := format(
        'base_pricing.unlogged_strategy_monthly_transactions_%s',
        p_strategy_id
    );

    -- 3a. DDL: drop old table and create empty shell
    sql_ddl := format(
$ddl$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s (
    opt_level_bins  TEXT        NOT NULL,
    fiscal_year     INTEGER     NOT NULL,
    fiscal_month    INTEGER     NOT NULL,
    actual_sales_units  BIGINT  NOT NULL
);
$ddl$,
        unlogged_table,
        unlogged_table
    );

    RAISE NOTICE 'Creating staging table %', unlogged_table;
    EXECUTE sql_ddl;

    -- 3b. Batch-INSERT aggregated data from bp_transaction_data_monthly
    --     Bins formula mirrors sp_strategy_forecast_bins_data exactly:
    --       - price_lock / zone_exception / NULL effective_price_zone  → store_id_segment_id
    --       - otherwise                                                → effective_price_zone_COALESCE(cluster,segment_id)
    --     Joined to bp_strategy_products_stores for valid rows only.
    --     bp_strategy_rule_segment_cluster_mapping provides the cluster.
    RAISE NOTICE 'Inserting into staging table %', unlogged_table;

    FOR rec_month IN
        SELECT DISTINCT fiscal_year, fiscal_month
        FROM base_pricing.bp_monthly_forecast
        WHERE strategy_id = p_strategy_id
          AND (p_fiscal_year IS NULL OR fiscal_year = p_fiscal_year)
          AND (p_fiscal_month IS NULL OR fiscal_month = p_fiscal_month)
        ORDER BY fiscal_year, fiscal_month
    LOOP
        sql_insert := format(
$ins$
INSERT INTO %s (opt_level_bins, fiscal_year, fiscal_month, actual_sales_units)
SELECT
    CONCAT(
        d.product_id::TEXT,
        '_',
        CASE
            WHEN attr.%I IS TRUE
              OR attr.%I IS TRUE
              OR attr.effective_price_zone IS NULL
            THEN CONCAT(d.store_id::TEXT, '_', d.segment_id::TEXT)
            ELSE CONCAT(
                attr.effective_price_zone,
                '_',
                COALESCE(srcm.cluster, d.segment_id::TEXT)
            )
        END
    )                           AS opt_level_bins,
    d.fiscal_year,
    d.fiscal_month,
    SUM(d.sales_units)          AS actual_sales_units
FROM base_pricing.bp_transaction_data_monthly d
INNER JOIN base_pricing.bp_strategy_products_stores bps
    ON  bps.product_id  = d.product_id
    AND bps.store_id    = d.store_id
    AND bps.segment_id  = d.segment_id
    AND bps.strategy_id = %s
INNER JOIN base_pricing.bp_product_store_attributes_mapping_v4 attr
    ON  attr.product_id = d.product_id
    AND attr.store_id   = d.store_id
    AND attr.segment_id = d.segment_id
LEFT JOIN base_pricing.bp_strategy_rule_segment_cluster_mapping srcm
    ON  srcm.strategy_id = %s
    AND srcm.segment_id  = d.segment_id
WHERE d.fiscal_year  = %s
  AND d.fiscal_month = %s
  AND d.end_date   >= %L
  AND d.start_date <= %L
GROUP BY
    d.product_id,
    d.store_id,
    d.segment_id,
    attr.effective_price_zone,
    attr.%I,
    attr.%I,
    srcm.cluster,
    d.fiscal_year,
    d.fiscal_month;
$ins$,
            unlogged_table,
            price_lock_col,
            zone_exception_col,
            p_strategy_id,
            p_strategy_id,
            rec_month.fiscal_year,
            rec_month.fiscal_month,
            date_min,
            date_max,
            price_lock_col,
            zone_exception_col
        );

        EXECUTE sql_insert;
        GET DIAGNOSTICS inserted_rows = ROW_COUNT;
        total_inserted := total_inserted + inserted_rows;

        RAISE NOTICE 'Inserted fiscal_year=% fiscal_month=% rows=%',
            rec_month.fiscal_year, rec_month.fiscal_month, inserted_rows;
    END LOOP;

    RAISE NOTICE 'Total staging rows inserted: %', total_inserted;

    -- 3c. Index for fast join during the batch UPDATE
    EXECUTE format(
        'CREATE INDEX idx_unstg_%s_bins ON %s (opt_level_bins, fiscal_year, fiscal_month);',
        p_strategy_id,
        unlogged_table
    );

    RAISE NOTICE 'Staging table % populated and indexed.', unlogged_table;

    -- ----------------------------------------------------------
    -- 4. Batch UPDATE bp_monthly_forecast.actual_sales_units
    --    Page through distinct opt_level_bins values (p_batch_size
    --    at a time) so each UPDATE touches a bounded row set and
    --    does not hold broad row-level locks.
    -- ----------------------------------------------------------
    RAISE NOTICE 'Starting batched UPDATE of bp_monthly_forecast for strategy_id=%', p_strategy_id;

    LOOP
        -- Fetch next page of opt_level_bins from the staging table
        sql_bins_page := format(
$pg$
SELECT ARRAY(
    SELECT DISTINCT opt_level_bins
    FROM %s
    ORDER BY opt_level_bins
    LIMIT %s OFFSET %s
)
$pg$,
            unlogged_table,
            p_batch_size,
            bins_offset
        );

        EXECUTE sql_bins_page INTO bins_batch;

        EXIT WHEN bins_batch IS NULL OR array_length(bins_batch, 1) IS NULL;

        sql_update := format(
$upd$
UPDATE base_pricing.bp_monthly_forecast mf
SET
    actual_sales_units = agg.actual_sales_units,
    updated_at         = NOW()
FROM (
    SELECT
        opt_level_bins,
        fiscal_year,
        fiscal_month,
        SUM(actual_sales_units) AS actual_sales_units
    FROM %s
    WHERE opt_level_bins = ANY(%L::TEXT[])
    GROUP BY opt_level_bins, fiscal_year, fiscal_month
) agg
WHERE mf.strategy_id    = %s
  AND mf.opt_level_bins = agg.opt_level_bins
  AND mf.fiscal_year    = agg.fiscal_year
  AND mf.fiscal_month   = agg.fiscal_month;
$upd$,
            unlogged_table,
            bins_batch,
            p_strategy_id
        );

        EXECUTE sql_update;
        GET DIAGNOSTICS batch_rows = ROW_COUNT;
        rows_updated  := rows_updated + batch_rows;
        bins_offset   := bins_offset  + p_batch_size;

        RAISE NOTICE 'UPDATE batch offset=% → % rows updated (cumulative: %)',
            bins_offset, batch_rows, rows_updated;
    END LOOP;

    RAISE NOTICE 'Batched UPDATE complete: % total rows updated for strategy_id=%',
        rows_updated, p_strategy_id;

    -- ----------------------------------------------------------
    -- 5. Cleanup staging table
    -- ----------------------------------------------------------
    EXECUTE format('DROP TABLE IF EXISTS %s;', unlogged_table);
    RAISE NOTICE 'Dropped staging table %', unlogged_table;

    -- ----------------------------------------------------------
    -- 6. Time tracking
    -- ----------------------------------------------------------
    end_time := clock_timestamp();
    RAISE NOTICE 'sp_strategy_monthly_transactions complete for strategy_id=% in %',
        p_strategy_id, end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            p_strategy_id,
            'sp_strategy_monthly_transactions',
            start_time,
            end_time,
            end_time - start_time
        );

END;
$$;
