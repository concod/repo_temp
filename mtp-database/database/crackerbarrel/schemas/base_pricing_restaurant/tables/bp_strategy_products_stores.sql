--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_products_stores_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_products_stores_1

CREATE TABLE IF NOT EXISTS base_pricing_restaurant.bp_strategy_products_stores (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NULL,
	CONSTRAINT unique_strategy_product_store UNIQUE (strategy_id, product_id, store_id, segment_id)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX IF NOT EXISTS idx_bp_strategy_products_stores_product_id ON  base_pricing_restaurant.bp_strategy_products_stores USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_bp_strategy_products_stores_product_store ON  base_pricing_restaurant.bp_strategy_products_stores USING btree (product_id, store_id, segment_id);
CREATE INDEX IF NOT EXISTS idx_bp_strategy_products_stores_segment_id ON  base_pricing_restaurant.bp_strategy_products_stores USING btree (segment_id);
CREATE INDEX IF NOT EXISTS idx_bp_strategy_products_stores_store_id ON  base_pricing_restaurant.bp_strategy_products_stores USING btree (store_id);


--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_strategy_products_stores_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_strategy_products_stores_2
ALTER TABLE base_pricing_restaurant.bp_strategy_products_stores
ADD COLUMN IF NOT EXISTS is_kvi bool DEFAULT false NOT NULL;