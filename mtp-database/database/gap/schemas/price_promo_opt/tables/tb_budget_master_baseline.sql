--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_budget_master_baseline  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_baseline

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_budget_master_baseline (
	product_id int4 NOT NULL,
	dates date NOT NULL,
	units int4 NULL,
	margin float4 NULL,
	revenue float4 NULL,
	store_id int4 NOT NULL,
	promo_spend float4 NULL,
	currency_id int4 NULL,
	store_reco_level text NULL,
	CONSTRAINT budgt_bls_b__pkey PRIMARY KEY (product_id, store_id, dates)
)
PARTITION BY RANGE (dates);
CREATE INDEX budget_bsl_b_prod_id_idx ON price_promo_opt.tb_budget_master_baseline USING btree (product_id);