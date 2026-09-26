--liquibase formatted sql
--changeset liquibase:tb_basket_redemption_product stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_basket_redemption_product

CREATE TABLE price_promo.tb_basket_redemption_product (
	c0_name text NULL,
	c0_id int4 NULL,
	product_code text NULL,
	s0_name text NULL,
	s0_id int4 NULL,
	phase int4 NULL,
	txn_percent float8 NULL,
	weighted_avg_basket_value float8 NULL,
	latest_base_price float8 NULL
);
CREATE INDEX basket_redemption_product_idx ON price_promo.tb_basket_redemption_product USING btree (product_code);