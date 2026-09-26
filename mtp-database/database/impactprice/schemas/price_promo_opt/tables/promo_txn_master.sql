--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:promo_txn_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_txn_master

CREATE TABLE IF NOT EXISTS price_promo_opt.promo_txn_master (
	product_id int4 NOT NULL,
	transaction_id text NOT NULL,
	store_id int4 NOT NULL,
	date_id date NOT NULL,
	currency text NULL,
	currency_id int4 NULL,
	no_of_txn int4 NULL,
	"cost" float8 NULL,
	base_price float8 NULL,
	base_price_secondary float8 NULL,
	retail_price float8 NULL,
	quantity float8 NULL,
	revenue float8 NULL,
	margin float8 NULL,
	selling_price float8 NULL,
	dis_amount float8 NULL,
	dis_perc float8 NULL,
	final_discount_percent float8 NULL,
	final_amount float8 NULL,
	promo_spend float8 NULL,
	promo_discount float8 NULL,
	coupon_amount float8 NULL,
	coupon_discount float8 NULL,
	aur float8 NULL,
	aum float8 NULL,
	store_reco_level text NULL,
	CONSTRAINT promo_txn_mstr_pkey_pr PRIMARY KEY (transaction_id, product_id, store_id, date_id)
)
PARTITION BY RANGE (date_id);
CREATE INDEX promo_txn_mstr__s1_id_product_id_idx ON price_promo_opt.promo_txn_master USING btree (product_id, store_reco_level);
CREATE INDEX promo_txn_mstr_product_id_idx ON price_promo_opt.promo_txn_master USING btree (product_id);