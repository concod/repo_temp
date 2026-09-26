--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:promo_txn  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_txn

CREATE TABLE IF NOT EXISTS price_promo_opt.promo_txn (
	product_id int4 NOT NULL,
	date_id date NOT NULL,
	store_id int4 NOT NULL,
	currency text NULL,
	currency_id int4 NULL,
	no_of_txn int4 NULL,
	"cost" float8 NULL,
	promo_base_price float8 NULL,
	quantity float8 NULL,
	revenue float8 NULL,
	margin float8 NULL,
	selling_price float8 NULL,
	promo_spend float8 NULL,
	promo_discount float8 NULL,
	price_spend float8 NULL,
	price_discount float8 NULL,
	coupon_spend float8 NULL,
	coupon_discount float8 NULL,
	aur float8 NULL,
	aum float8 NULL,
	clearance_indicator int4 NULL,
	store_reco_level text NULL,
	CONSTRAINT promo_txn_pkey_pr PRIMARY KEY (product_id, date_id, store_id)
)
PARTITION BY RANGE (date_id);
CREATE INDEX promo_product_id_idx ON price_promo_opt.promo_txn USING btree (product_id);
CREATE INDEX promo_s1_id_product_id_idx ON price_promo_opt.promo_txn USING btree (product_id, store_id);