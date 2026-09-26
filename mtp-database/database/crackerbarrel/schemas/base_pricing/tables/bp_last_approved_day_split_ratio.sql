--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_day_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_last_approved_day_split_ratio

CREATE TABLE base_pricing.bp_last_approved_day_split_ratio (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	"date" date NOT NULL,
	day_split_ratio float4 NOT NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_day_split_ratio_pkey PRIMARY KEY (strategy_id, product_id, channel_id, segment_id, week_start_date, date)
);

CREATE INDEX idx_last_approved_day_approval_date ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_day_date_range ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, date);
CREATE INDEX idx_last_approved_day_l0_l1_l2_l3_channel ON base_pricing.bp_last_approved_day_split_ratio USING btree (product_id, channel_id);
CREATE INDEX idx_last_approved_day_l0_l1_l2_l3_channel_seg ON base_pricing.bp_last_approved_day_split_ratio USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_day_strategy_id ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id);
CREATE INDEX idx_last_approved_day_week_range ON base_pricing.bp_last_approved_day_split_ratio USING btree (strategy_id, week_start_date);


-- bp_last_approved_day_split_ratio foreign keys

ALTER TABLE base_pricing.bp_last_approved_day_split_ratio ADD CONSTRAINT bp_last_approved_day_split_ratio_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE;