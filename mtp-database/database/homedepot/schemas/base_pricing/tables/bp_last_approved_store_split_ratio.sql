
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_store_split_ratio_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_last_approved_store_split_ratio_v2


CREATE TABLE base_pricing.bp_last_approved_store_split_ratio (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	s0_id int4 NOT NULL,
	s1_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_ratio float8 NOT NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_store_split_ratio_pkey PRIMARY KEY (strategy_id, product_id, store_id, week_start_date),
	CONSTRAINT bp_last_approved_store_split_ratio_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE
);
CREATE INDEX idx_last_approved_store_approval_date ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_store_date_range ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id, week_start_date);
CREATE INDEX idx_last_approved_store_product_store_date ON base_pricing.bp_last_approved_store_split_ratio USING btree (product_id, store_id, week_start_date);
CREATE INDEX idx_last_approved_store_strategy_date_product_store ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id, week_start_date, product_id, store_id);
CREATE INDEX idx_last_approved_store_strategy_id ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id);