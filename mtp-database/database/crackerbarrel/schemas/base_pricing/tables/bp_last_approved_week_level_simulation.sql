--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_last_approved_week_level_simulation stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_last_approved_week_level_simulation

CREATE TABLE base_pricing.bp_last_approved_week_level_simulation (
	strategy_id int4 NOT NULL,
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	min_cost float4 NOT NULL,
	base_percentage float4 NOT NULL,
	sim_markup_percentage float4 NOT NULL,
	price_point float4 NOT NULL,
	sales_units float4 NOT NULL,
	elasticity_bp float4 NOT NULL,
	promo_elasticity float4 NOT NULL,
	confidence text NULL,
	snapshot_created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	approval_date timestamp NOT NULL,
	created_by int4 NOT NULL,
	CONSTRAINT bp_last_approved_week_level_simulation_pkey PRIMARY KEY (strategy_id, product_id, channel_id, segment_id, week_start_date, price_point)
);

CREATE INDEX idx_last_approved_week_approval_date ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id, approval_date);
CREATE INDEX idx_last_approved_week_date_range ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date);
CREATE INDEX idx_last_approved_week_main ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, segment_id, week_start_date) INCLUDE (channel_id, min_cost, base_percentage, price_point, sales_units, elasticity_bp, promo_elasticity, confidence);
CREATE INDEX idx_last_approved_week_prod_channel_date ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, channel_id, week_start_date);
CREATE INDEX idx_last_approved_week_prod_channel_seg ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, channel_id, segment_id);
CREATE INDEX idx_last_approved_week_prod_channel_seg_date ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_week_prod_seg ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, segment_id);
CREATE INDEX idx_last_approved_week_prod_seg_week ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, segment_id, week_start_date);
CREATE INDEX idx_last_approved_week_product_date ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id, week_start_date);
CREATE INDEX idx_last_approved_week_products ON base_pricing.bp_last_approved_week_level_simulation USING btree (product_id);
CREATE INDEX idx_last_approved_week_segments ON base_pricing.bp_last_approved_week_level_simulation USING btree (segment_id);
CREATE INDEX idx_last_approved_week_strategy_date_product ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id, week_start_date, product_id);
CREATE INDEX idx_last_approved_week_strategy_id ON base_pricing.bp_last_approved_week_level_simulation USING btree (strategy_id);


-- bp_last_approved_week_level_simulation foreign keys

ALTER TABLE base_pricing.bp_last_approved_week_level_simulation ADD CONSTRAINT bp_last_approved_week_level_simulation_strategy_fk FOREIGN KEY (strategy_id) REFERENCES base_pricing.bp_strategy_master(strategy_id) ON DELETE CASCADE;