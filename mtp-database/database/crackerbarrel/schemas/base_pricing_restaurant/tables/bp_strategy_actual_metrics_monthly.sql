--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:bp_strategy_actual_metrics_monthly_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_actual_metrics_monthly

CREATE TABLE IF NOT EXISTS base_pricing_restaurant.bp_strategy_actual_metrics_monthly (
    strategy_id             INTEGER          NOT NULL,
    opt_level_bins          TEXT             NOT NULL,
    product_id              INTEGER          NOT NULL,
    store_id                TEXT             NOT NULL,
    segment_id              INTEGER          NOT NULL,
    time_period             DATE             NOT NULL,
    month                   INTEGER          NOT NULL,
    year                    INTEGER,
    base_price              DOUBLE PRECISION,
    sales_units             BIGINT,
    revenue                 DOUBLE PRECISION,
    gross_margin_dollar     DOUBLE PRECISION,
    gross_margin_percentage DOUBLE PRECISION,
    average_selling_price   DOUBLE PRECISION,
    average_unit_margin     DOUBLE PRECISION,
    transactions            INTEGER,
    total_base_cost         DOUBLE PRECISION,
    total_additional_cost   DOUBLE PRECISION,
    total_contri_margin     DOUBLE PRECISION,
    created_at              TIMESTAMPTZ      DEFAULT NOW(),
    updated_at              TIMESTAMPTZ      DEFAULT NOW(),
    PRIMARY KEY (strategy_id, opt_level_bins, time_period)
) PARTITION BY LIST (strategy_id);

CREATE INDEX IF NOT EXISTS idx_bpr_saamm_main
    ON base_pricing_restaurant.bp_strategy_actual_metrics_monthly (strategy_id, time_period)
    INCLUDE (product_id, store_id, segment_id);

CREATE INDEX IF NOT EXISTS idx_bpr_saamm_product
    ON base_pricing_restaurant.bp_strategy_actual_metrics_monthly (product_id, store_id, segment_id);

CREATE INDEX IF NOT EXISTS idx_bpr_saamm_time
    ON base_pricing_restaurant.bp_strategy_actual_metrics_monthly (time_period);
