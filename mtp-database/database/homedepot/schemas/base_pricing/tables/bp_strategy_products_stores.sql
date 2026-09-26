
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_products_stores_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_products_stores_v2

CREATE TABLE base_pricing.bp_strategy_products_stores (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NULL,
	CONSTRAINT unique_strategy_product_store UNIQUE (strategy_id, product_id, store_id, segment_id)
)
PARTITION BY LIST (strategy_id);
CREATE INDEX idx_bp_strategy_products_stores_product_id ON  base_pricing.bp_strategy_products_stores USING btree (product_id);
CREATE INDEX idx_bp_strategy_products_stores_store_id ON  base_pricing.bp_strategy_products_stores USING btree (store_id);

CREATE INDEX idx_bp_strategy_products_stores_segment_id ON  base_pricing.bp_strategy_products_stores USING btree (segment_id);

create index idx_bp_strategy_products_stores_product_store on base_pricing.bp_strategy_products_stores using btree (product_id, store_id, segment_id);