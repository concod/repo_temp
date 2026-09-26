--liquibase formatted sql
--changeset liquibase:tb_basket_redemption_product stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_promo.tb_basket_redemption_product

CREATE TABLE IF NOT EXISTS price_promo.tb_basket_redemption_product (
	c0_id int4 NULL,
	product_id int4 NULL,
	s1_id int4 NULL,
	phase int4 NULL,
	txn_percent float8 NULL,
	weighted_avg_basket_value float8 NULL,
	latest_base_price float8 NULL
);
