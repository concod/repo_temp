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

--changeset liquibase:alter_promo_txn stripComments:false splitStatements:false context:Release_1_0
--comment: ALTER statements to sync schema with database

ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS price_discount;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS store_reco_level;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS aum_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS aur_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS base_price float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS base_price_secondary int4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS base_price_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS coupon_amount float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS coupon_amount_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS coupon_discount_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS final_amount float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS final_amount_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS final_discount_percent float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS final_discount_percent_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_dis_amount float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_dis_amount_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_dis_perc_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_disc_perc float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_margin float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_margin_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_quantity int4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_revenue float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_revenue_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_sp float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS gross_sp_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS promo_amount float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS promo_amount_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS promo_discount_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS qunatity int4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS retail_price float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS retail_price_with_vat float4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS s0_id int4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS s1_id int4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS total_inv int4 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS vat_rate_per float4 NULL;

--changeset harshith.mandli@impactanalytics.co:alter_promo_txn_v2 stripComments:false splitStatements:false context:Release_1_0 labels: alter_promo_txn_v2
--comment: ALTER statements to sync schema with dev database

ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS price_discount float8 NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS store_reco_level text NULL;
ALTER TABLE price_promo_opt.promo_txn ADD COLUMN IF NOT EXISTS inventory int4 NULL;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS aum_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS aur_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS base_price;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS base_price_secondary;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS base_price_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS coupon_amount;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS coupon_amount_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS coupon_discount_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS final_amount;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS final_amount_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS final_discount_percent;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS final_discount_percent_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_dis_amount;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_dis_amount_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_dis_perc_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_disc_perc;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_margin;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_margin_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_quantity;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_revenue;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_revenue_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_sp;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS gross_sp_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS promo_amount;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS promo_amount_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS promo_discount_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS qunatity;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS retail_price;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS retail_price_with_vat;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS s0_id;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS s1_id;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS total_inv;
ALTER TABLE price_promo_opt.promo_txn DROP COLUMN IF EXISTS vat_rate_per;
