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

--changeset sreevathsa.sp:add_primary_key_and_index_20251223 stripComments:false splitStatements:false context:Release_1_0 labels:tb_product_store_price_alter
--comment: Add PRIMARY KEY constraint and index to tb_product_store_price
--rollback: ALTER TABLE price_promo.tb_product_store_price DROP CONSTRAINT tb_product_store_price_pk; DROP INDEX price_promo.tb_product_store_price_idx;

ALTER TABLE price_promo.tb_product_store_price ADD CONSTRAINT tb_product_store_price_pk PRIMARY KEY (product_id, store_id);
CREATE INDEX tb_product_store_price_idx ON price_promo.tb_product_store_price USING btree (product_id, store_id);