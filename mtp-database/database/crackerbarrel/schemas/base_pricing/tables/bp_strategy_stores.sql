--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_stores stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_stores

CREATE TABLE base_pricing.bp_strategy_stores (
	strategy_id int4 NOT NULL,
	store_id int4 NOT NULL,
	CONSTRAINT unique_strategy_store UNIQUE (strategy_id, store_id)
)
PARTITION BY LIST (strategy_id);

CREATE INDEX idx_bp_strategy_stores_store_id ON  base_pricing.bp_strategy_stores USING btree (store_id);
CREATE INDEX idx_bp_strategy_stores_strategy_id ON  base_pricing.bp_strategy_stores USING btree (strategy_id);