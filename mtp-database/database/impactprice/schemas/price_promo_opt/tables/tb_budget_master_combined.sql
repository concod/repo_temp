--liquibase formatted sql
--changeset sreevathsa.sp:tb_budget_master_combined_20251223 stripComments:false splitStatements:false context:Release_1_0 labels:tb_budget_master_combined
--comment: Create tb_budget_master_combined table

CREATE TABLE IF NOT EXISTS price_promo_opt.tb_budget_master_combined (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	dates date NOT NULL,
	currency_id int4 NOT NULL,
	store_reco_level text NOT NULL,
	ty_units numeric NULL,
	ty_margin numeric NULL,
	ty_revenue numeric NULL,
	ty_promo_spend numeric NULL,
	baseline_units numeric NULL,
	baseline_margin numeric NULL,
	baseline_revenue numeric NULL,
	baseline_promo_spend numeric NULL,
	CONSTRAINT tb_budget_master_combined_uk UNIQUE (product_id, store_id, dates)
);

CREATE INDEX IF NOT EXISTS idx_tb_budget_master_combined_keys 
	ON price_promo_opt.tb_budget_master_combined USING btree (product_id, store_id, dates);
