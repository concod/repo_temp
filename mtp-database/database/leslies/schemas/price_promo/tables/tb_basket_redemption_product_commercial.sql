--liquibase formatted sql
--changeset liquibase:tb_basket_redemption_product_commercial stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_basket_redemption_product_commercial

CREATE TABLE price_promo.tb_basket_redemption_product_commercial (
	product_code text NULL,
	c0_name text NULL,
	c0_id int4 NULL,
	c2_name text NULL,
	c2_id int4 NULL,
	phase int4 NULL,
	txn_percent float8 NULL,
	weighted_avg_basket_value float8 NULL,
	latest_base_price float8 NULL
);
CREATE INDEX basket_redemption_product_commercial_idx ON price_promo.tb_basket_redemption_product_commercial USING btree (product_code);