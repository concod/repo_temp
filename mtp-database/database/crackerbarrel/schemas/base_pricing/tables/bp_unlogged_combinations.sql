--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_unlogged_combinations stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_unlogged_combinations

CREATE UNLOGGED TABLE base_pricing.bp_unlogged_combinations (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	is_kvi bool NULL
)
PARTITION BY LIST (strategy_id);

CREATE INDEX idx_bp_unlogged_combinations_prod_seg ON  base_pricing.bp_unlogged_combinations USING btree (product_id, segment_id);
CREATE INDEX idx_bp_unlogged_combinations_prod_store_seg ON  base_pricing.bp_unlogged_combinations USING btree (product_id, store_id, segment_id);
CREATE INDEX idx_bp_unlogged_combinations_products ON  base_pricing.bp_unlogged_combinations USING btree (product_id);
CREATE INDEX idx_bp_unlogged_combinations_segments ON  base_pricing.bp_unlogged_combinations USING btree (segment_id);
CREATE INDEX idx_bp_unlogged_combinations_stores ON  base_pricing.bp_unlogged_combinations USING btree (store_id);