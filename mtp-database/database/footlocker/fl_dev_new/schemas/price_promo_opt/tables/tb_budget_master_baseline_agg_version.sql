
--liquibase formatted sql
--changeset liquibase:tb_budget_master_baseline_agg_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_baseline_agg_version_v3

DROP TABLE IF EXISTS price_promo_opt.tb_budget_master_baseline_agg_version CASCADE;

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_budget_master_baseline_agg_version (
    product_id int4 NOT NULL,
    dates date NOT NULL,
    store_reco_level text NOT NULL,
    currency_id int4 NULL,
	units BIGINT NULL,
	margin NUMERIC(20,2) NULL,
	revenue NUMERIC(20,2) NULL,
    promo_spend float4 NULL,
    version_code int4 NOT NULL,
    CONSTRAINT tb_budget_master_baseline_agg_version_pk
      PRIMARY KEY (product_id, dates, store_reco_level, version_code)
)
PARTITION BY LIST (version_code);