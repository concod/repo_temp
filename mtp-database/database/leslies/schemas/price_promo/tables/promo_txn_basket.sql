--liquibase formatted sql
--changeset liquibase:promo_txn_basket_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_txn_basket_v3

DROP TABLE IF EXISTS price_promo.promo_txn_basket CASCADE;
CREATE TABLE price_promo.promo_txn_basket (
	date_id date NOT NULL,
	channel text NOT NULL,
	store_id int4 NOT NULL,
	c0_name varchar NULL,
	c0_id int4 NOT NULL,
	l5_id text NULL,
	product_id int4 NOT NULL,
	transaction_id text NOT NULL,
	clearance_indicator int4 NULL,
	gross_cost float4 NULL,
	gross_launch_price float4 NULL,
	gross_retail_price float4 NULL,
	gross_quantity int4 NULL,
	gross_revenue float4 NULL,
	gross_margin float4 NULL,
	contri_margin float4 NULL,
	aur float4 NULL,
	aum float4 NULL,
	gross_disc float4 NULL,
	gross_promo_discount_percent float4 NULL,
	gross_coupon_discount_percent float4 NULL,
	gross_dis_perc float4 NULL,
	gross_sp float4 NULL,
	total_inv int4 NULL,
	currency_id int4 NULL,
	gross_promo_disc float4 NULL,
	c2_name varchar NULL,
	c2_id int4 NULL,
	CONSTRAINT promo_txn_basket_pkey PRIMARY KEY (transaction_id, product_id, store_id, channel, date_id, c0_id)
)
PARTITION BY RANGE (date_id);
CREATE INDEX promo_txn_basket_product_id_idx ON price_promo.promo_txn_basket USING btree (product_id);
CREATE INDEX promo_txn_basket_s1_id_product_id_idx ON price_promo.promo_txn_basket USING btree (product_id, store_id);
