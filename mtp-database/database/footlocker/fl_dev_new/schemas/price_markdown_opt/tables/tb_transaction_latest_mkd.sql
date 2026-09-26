--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_transaction_latest_mkd_v290525 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_transaction_latest_mkd_v290525

CREATE TABLE price_markdown_opt.tb_transaction_latest_mkd (
	product_id int4 NOT NULL,
	date_id date NOT NULL,
	store_id int4 NOT NULL,
	currency text NULL,
	currency_id int4 NULL,
	no_of_txn int4 NULL,
	"cost" float4 NULL,
	base_price_with_vat float4 NULL,
	base_price float4 NULL,
	base_price_secondary int4 NULL,
	retail_price_with_vat float4 NULL,
	retail_price float4 NULL,
	gross_quantity int4 NULL,
	gross_revenue float4 NULL,
	gross_revenue_with_vat float4 NULL,
	gross_margin float4 NULL,
	gross_margin_with_vat float4 NULL,
	gross_sp_with_vat float4 NULL,
	gross_sp float4 NULL,
	gross_dis_amount_with_vat float4 NULL,
	gross_dis_amount float4 NULL,
	gross_dis_perc float4 NULL,
	gross_dis_perc_with_vat float4 NULL,
	final_discount_percent_with_vat float4 NULL,
	final_discount_percent float4 NULL,
	final_amount float4 NULL,
	final_amount_with_vat float4 NULL,
	promo_amount float4 NULL,
	promo_amount_with_vat float4 NULL,
	promo_discount float4 NULL,
	promo_discount_with_vat float4 NULL,
	coupon_amount_with_vat float4 NULL,
	coupon_amount float4 NULL,
	coupon_discount float4 NULL,
	coupon_discount_with_vat float4 NULL,
	aur float4 NULL,
	aur_with_vat float4 NULL,
	aum float4 NULL,
	aum_with_vat float4 NULL,
	total_inv int4 NULL,
	vat_rate_per float4 NULL,
	clearance_indicator int4 NOT NULL,
	CONSTRAINT tb_transaction_latest_mkd_pk PRIMARY KEY (product_id, store_id, date_id, clearance_indicator)
)
PARTITION BY RANGE (date_id);
CREATE INDEX mkd_txn_store_id_product_id_date_idx ON price_markdown_opt.tb_transaction_latest_mkd USING btree (product_id, store_id, date_id);

--changeset siddharth.bajpai@impactanalytics.co:sync_tb_transaction_latest_mkd_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_transaction_latest_mkd
--comment: Sync tb_transaction_latest_mkd table structure with dev DB DDL

-- Drop columns not in dev DB
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd DROP COLUMN IF EXISTS base_price_with_vat CASCADE;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd DROP COLUMN IF EXISTS base_price CASCADE;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd DROP COLUMN IF EXISTS base_price_secondary CASCADE;

-- Add missing columns
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS s0_id int4 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS s1_id int4 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS selling_price float4 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS selling_price_with_vat float4 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS sync_date_time date NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS retail_price_with_vat float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS revenue_with_vat float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS margin_with_vat float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS aur_with_vat float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS aum_with_vat float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS final_price_with_vat float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS promo_spend float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS promo_discount float8 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS version_code int4 NOT NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS dis_amount float4 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS dis_perc float4 NULL;
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ADD COLUMN IF NOT EXISTS store_reco_level text NULL;

-- Fix currency_id type from int4 to int8
ALTER TABLE price_markdown_opt.tb_transaction_latest_mkd ALTER COLUMN currency_id TYPE int8 USING currency_id::bigint;

-- Fix index to use ON ONLY
DROP INDEX IF EXISTS price_markdown_opt.mkd_txn_store_id_product_id_date_idx CASCADE;
CREATE INDEX mkd_txn_store_id_product_id_date_idx ON price_markdown_opt.tb_transaction_latest_mkd USING btree (product_id, store_id, date_id);