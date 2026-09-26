--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_store_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_last_approved_store_split_ratio

CREATE TABLE base_pricing.bp_last_approved_store_split_ratio (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_store_split_ratio_pkey PRIMARY KEY (strategy_id, product_id, store_id, channel_id, segment_id, week_start_date)
);

CREATE INDEX idx_last_approved_store_approval_date ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_store_date_range ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id, week_start_date);
CREATE INDEX idx_last_approved_store_l0_l1_l2_l3_channel ON base_pricing.bp_last_approved_store_split_ratio USING btree (product_id, channel_id);
CREATE INDEX idx_last_approved_store_l0_l1_l2_l3_channel_seg ON base_pricing.bp_last_approved_store_split_ratio USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_store_seg_week_query ON base_pricing.bp_last_approved_store_split_ratio USING btree (segment_id, week_start_date) INCLUDE (product_id, channel_id, store_split_ratio);
CREATE INDEX idx_last_approved_store_store_date ON base_pricing.bp_last_approved_store_split_ratio USING btree (store_id, week_start_date);
CREATE INDEX idx_last_approved_store_strategy_id ON base_pricing.bp_last_approved_store_split_ratio USING btree (strategy_id);


-- bp_last_approved_store_split_ratio foreign keys

ALTER TABLE base_pricing.bp_last_approved_store_split_ratio ADD CONSTRAINT bp_last_approved_store_split_ratio_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE;