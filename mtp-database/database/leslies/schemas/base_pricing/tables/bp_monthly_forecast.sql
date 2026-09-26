--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:bp_monthly_forecast_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_monthly_forecast_10

CREATE TABLE base_pricing.bp_monthly_forecast (
    id bigserial NOT NULL,
    opt_level_bins varchar(255) NOT NULL,
    product_id int4 NOT NULL,
    segment_id int4 NOT NULL,
    price_zone varchar(255) NULL,
    strategy_id int4 NOT NULL,
    fiscal_month int4 NULL,
    fiscal_month_name varchar(50) NULL,
    fiscal_year int4 NULL,
    start_date date NULL,
    end_date date NULL,
    predicted float8 NULL,
    min_cost float8 NULL,
    price_point float8 NULL,
    base_percentage float8 NULL,
    elasticity_bp float8 NULL,
    promo_source float8 NULL,
    effective_reference_price float8 NULL,
    weighted_promo_percent float8 NULL,
    promo_elasticity float8 NULL,
    cost float8 NULL,
    base_price float8 NULL,
    sales_units int4 NULL,
    gross_margin_dollar float8 NULL,
    gross_margin_percentage float8 NULL,
    aum float8 NULL,
    asp float8 NULL,
    revenue float8 NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL,
    ia_cost float8 NULL,
    ia_base_price float8 NULL,
    ia_sales_units int4 NULL,
    ia_revenue float8 NULL,
    ia_gross_margin_dollar float8 NULL,
    ia_gross_margin_percentage float8 NULL,
    ia_aum float8 NULL,
    ia_asp float8 NULL,
    finalized_cost float8 NULL,
    finalized_base_price float8 NULL,
    finalized_sales_units int4 NULL,
    finalized_revenue float8 NULL,
    finalized_gross_margin_dollar float8 NULL,
    finalized_gross_margin_percentage float8 NULL,
    finalized_aum float8 NULL,
    finalized_asp float8 NULL,
    channel_id int4 NULL,
    line_group varchar(255) NULL,
    actual_sales_units int8 NULL,
    CONSTRAINT bp_monthly_forecast_pkey PRIMARY KEY (id)
);

-- Create indexes
CREATE INDEX idx_bp_monthly_forecast_opt_level ON base_pricing.bp_monthly_forecast USING btree (opt_level_bins);
CREATE INDEX idx_bp_monthly_forecast_period ON base_pricing.bp_monthly_forecast USING btree (strategy_id, fiscal_year, fiscal_month);
CREATE INDEX idx_bp_monthly_forecast_strategy_id ON base_pricing.bp_monthly_forecast USING btree (strategy_id);
CREATE UNIQUE INDEX uq_bp_monthly_forecast_bin_month ON base_pricing.bp_monthly_forecast USING btree (strategy_id, opt_level_bins, fiscal_month, fiscal_year);
