--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_budget_master_ty  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_ty

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_budget_master_ty (
	product_id int4 NOT NULL,
	dates date NOT NULL,
	units int4 NULL,
	margin float4 NULL,
	revenue float4 NULL,
	store_id int4 NOT NULL,
	promo_spend float4 NULL,
	CONSTRAINT budgt_ty__pkey PRIMARY KEY (product_id, store_id, dates)
)
PARTITION BY RANGE (dates);
CREATE INDEX budget_bsl_prod_id_idx ON price_promo_opt.tb_budget_master_ty USING btree (product_id);