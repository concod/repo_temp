--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::tb_agg_actual_local_20251106 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_agg_actual_local

CREATE TABLE "price_markdown"."tb_agg_actual_local" (
    strategy_id int4 NOT NULL,
    product_level_id int4 NOT NULL,
    store_level_id int4 NOT NULL,
    recommendation_date date NOT NULL,
    recommended_offer_percentage float8 NOT NULL,
    effective_price_point float8 NOT NULL,
    pcd_id int4 NOT NULL,
    sales_units float8 NULL DEFAULT 0,
    margin float8 NULL DEFAULT 0,
    revenue float8 NULL DEFAULT 0,
    status int2 NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NULL DEFAULT now(),
    created_by int4 NOT NULL DEFAULT 0,
    updated_by int4 NULL DEFAULT 0,
    rem_inv float8 NULL,
    spend float8 NULL,
    sales_units_uncapped float8 NULL,
    currency_id int8 NULL,
    effective_price_point_with_vat float8 NULL,
    margin_with_vat float8 NULL,
    revenue_with_vat float8 NULL,
    spend_with_vat float8 NULL
)
PARTITION BY LIST (strategy_id);
