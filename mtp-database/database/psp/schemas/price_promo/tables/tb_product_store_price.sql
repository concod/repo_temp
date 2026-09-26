--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_product_store_price_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_store_price

DROP TABLE IF EXISTS price_promo.tb_product_store_price CASCADE;
CREATE TABLE IF NOT EXISTS price_promo.tb_product_store_price (
	product_id int4 NULL,
	store_id int4 NULL,
	customer_id text NULL,
	clearance_indicator text NULL,
	promo_base_price numeric NULL,
	"cost" numeric NULL,
	previous_promo_base_price numeric NULL,
	last_reg_price numeric NULL,
	effective_from_date date NULL,
	effective_till_date timestamp NULL,
	currency_id text NULL,
	updated_at timestamp NULL,
	promo_base_price_valid_from date DEFAULT '2025-08-01'::date NULL,
	promo_base_price_valid_to date DEFAULT '2026-08-01'::date NULL
);