--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_products stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_products

CREATE TABLE base_pricing_restaurant.bp_strategy_products (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	CONSTRAINT unique_strategy_product UNIQUE (strategy_id, product_id)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_strategy_products_product_id ON  base_pricing_restaurant.bp_strategy_products USING btree (product_id);
CREATE INDEX idx_bp_strategy_products_strategy_id ON  base_pricing_restaurant.bp_strategy_products USING btree (strategy_id);