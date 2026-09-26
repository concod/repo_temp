--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_promo_week_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_last_approved_promo_week_1

CREATE TABLE base_pricing_restaurant.bp_last_approved_promo_week (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	promo_source int4 NOT NULL,
	reference_price float4 NULL,
	weighted_promo_percent float4 NULL,
	effective_reference_price float4 NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_promo_week_pkey PRIMARY KEY (strategy_id, product_id, channel_id, segment_id, week_start_date),
	CONSTRAINT bp_last_approved_promo_week_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing_restaurant.bp_strategy_master(strategy_id) ON DELETE CASCADE
);
CREATE INDEX idx_last_approved_promo_approval_date ON base_pricing_restaurant.bp_last_approved_promo_week USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_promo_date_range ON base_pricing_restaurant.bp_last_approved_promo_week USING btree (strategy_id, week_start_date);
CREATE INDEX idx_last_approved_promo_product_channel ON base_pricing_restaurant.bp_last_approved_promo_week USING btree (product_id, channel_id);
CREATE INDEX idx_last_approved_promo_product_channel_seg ON base_pricing_restaurant.bp_last_approved_promo_week USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_promo_strategy_id ON base_pricing_restaurant.bp_last_approved_promo_week USING btree (strategy_id);