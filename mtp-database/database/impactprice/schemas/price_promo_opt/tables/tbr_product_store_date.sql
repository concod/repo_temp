--liquibase formatted sql
--changeset harshith.mandli@impactanalytics.co:tbr_product_store_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changes for tbr_product_store_date
DROP table if exists price_promo_opt.tbr_product_store_date;

CREATE TABLE price_promo_opt.tbr_product_store_date (
	product_id int8 NOT NULL,
	store_reco_level text NOT NULL,
	"date" date NOT NULL,
	baseline_sales_units int8 DEFAULT 0 NULL,
	baseline_revenue numeric(20, 2) DEFAULT 0 NULL,
	baseline_margin numeric(20, 2) DEFAULT 0 NULL,
	actual_sales_units float8 DEFAULT 0 NULL,
	actual_revenue float8 DEFAULT 0 NULL,
	actual_margin float8 DEFAULT 0 NULL,
	ly_sales_units float8 DEFAULT 0 NULL,
	ly_revenue float8 DEFAULT 0 NULL,
	ly_margin float8 DEFAULT 0 NULL,
	mfp_sales_units int8 DEFAULT 0 NULL,
	mfp_revenue numeric(20, 2) DEFAULT 0 NULL,
	mfp_margin numeric(20, 2) DEFAULT 0 NULL,
	promo_sales_units float8 DEFAULT 0 NULL,
	promo_revenue float8 DEFAULT 0 NULL,
	promo_margin float8 DEFAULT 0 NULL,
	currency_id int4 DEFAULT 1 NOT NULL,
	CONSTRAINT tbr_prod_store_date_curr_pkey PRIMARY KEY (product_id, store_reco_level, date, currency_id)
)
PARTITION BY RANGE (date);
CREATE INDEX tbr_curr_date_idx ON price_promo_opt.tbr_product_store_date USING btree (currency_id, date);
CREATE INDEX tbr_date_idx ON price_promo_opt.tbr_product_store_date USING btree (date);
CREATE INDEX tbr_prod_store_date_curr_idx ON price_promo_opt.tbr_product_store_date USING btree (product_id, store_reco_level, date, currency_id);