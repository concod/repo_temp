--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_budget_master_baseline_agg_v2  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_baseline_agg_v2

DROP TABLE IF EXISTS price_promo_opt.tb_budget_master_baseline_agg CASCADE;

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_budget_master_baseline_agg (
	product_id int4 NOT NULL,
	dates date NOT NULL,
	store_reco_level text NOT NULL,
	currency_id int4 NULL,
	units BIGINT NULL,
	margin NUMERIC(20,2) NULL,
	revenue NUMERIC(20,2) NULL,
	promo_spend float4 NULL,
	CONSTRAINT budgt_bsl_agg__pkey PRIMARY KEY (product_id, store_reco_level, dates)
)
PARTITION BY RANGE (dates);
CREATE INDEX bud_bsl_prod_aggeg_id_idx ON price_promo_opt.tb_budget_master_baseline_agg USING btree (product_id);