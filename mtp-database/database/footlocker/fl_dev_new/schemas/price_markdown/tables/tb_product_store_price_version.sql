--liquibase formatted sql
--changeset siddharth.bajpai@impactanalytics.co:tb_product_store_price_version_20251216 stripComments:false splitStatements:false context:Release_1_0 labels:tb_product_store_price
--comment: Create tb_product_store_price_version table

CREATE TABLE IF NOT EXISTS price_markdown.tb_product_store_price_version (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
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
	promo_base_price_valid_from date NULL,
	promo_base_price_valid_to date NULL,
	version_code int4 NULL,
	msrp numeric NULL,
	current_price numeric NULL,
	msrp_with_vat numeric NULL,
	current_price_with_vat numeric NULL,
	CONSTRAINT tb_product_store_price_uk UNIQUE (version_code, product_id, store_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX psp_version_idx ON price_markdown.tb_product_store_price_version USING btree (product_id);

