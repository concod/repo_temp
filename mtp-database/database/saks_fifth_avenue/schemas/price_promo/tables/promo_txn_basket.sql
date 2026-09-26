--liquibase formatted sql
--changeset liquibase:promo_txn_basket stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_txn_basket

CREATE TABLE price_promo.promo_txn_basket (
	date_id date NOT NULL,
	s0_id int4 NOT NULL,
	s1_id int4 NOT NULL,
	country text NULL,
	channel text NULL,
	transaction_id text NOT NULL,
	store_id int4 NOT NULL,
	l5_id int8 NULL,
	product_id int8 NOT NULL,
	clearance_indicator int4 NULL,
	"cost" float4 NULL,
	base_price float4 NULL,
	retail_price float4 NULL,
	quantity int4 NULL,
	revenue float4 NULL,
	margin float4 NULL,
	aur float4 NULL,
	aum float4 NULL,
	final_price float4 NULL,
	final_discount_percent float4 NULL,
	promo_discount float4 NULL,
	total_inv int4 NULL,
	pre_coupon_price float4 NULL,
	coupon_amount float4 NULL,
	coupon_discount float4 NULL,
	extended_discount float4 NULL,
	sync_date_time date NULL,
	CONSTRAINT promo_txn_basket_pkey PRIMARY KEY (transaction_id, product_id, s0_id, s1_id, store_id, date_id)
)
PARTITION BY RANGE (date_id);
--call price_promo_opt.pc_create_date_partitions('price_promo', 'promo_txn_basket', 'day', '2 month');
CREATE INDEX promo_txn_basket_product_id_idx ON price_promo.promo_txn_basket USING btree (product_id);
CREATE INDEX promo_txn_basket_s1_id_idx ON price_promo.promo_txn_basket USING btree (s1_id);
CREATE INDEX promo_txn_basket_s1_id_product_id_idx ON price_promo.promo_txn_basket USING btree (product_id, s0_id, s1_id);


--changeset kumaran.k@impactanalytics.co:promo_txn_basket_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.promo_txn_basket_v3
ALTER TABLE price_promo.promo_txn_basket
DROP CONSTRAINT promo_txn_basket_pkey;

ALTER TABLE price_promo.promo_txn_basket
ADD CONSTRAINT promo_txn_basket_pkey PRIMARY KEY (transaction_id, product_id, s0_id, s1_id, store_id, date_id, clearance_indicator);