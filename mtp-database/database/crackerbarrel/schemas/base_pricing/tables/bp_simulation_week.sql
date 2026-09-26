--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_week stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_week

CREATE TABLE base_pricing.bp_simulation_week (
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
	CONSTRAINT bp_simulation_week_pk PRIMARY KEY (product_id, channel_id, segment_id, week_start_date, price_point)
)
PARTITION BY RANGE (week_start_date);

CREATE INDEX idx_bp_simulation_week_id1 ON  base_pricing.bp_simulation_week USING btree (product_id, channel_id, segment_id);
CREATE INDEX idx_bp_simulation_week_id2 ON  base_pricing.bp_simulation_week USING btree (week_start_date);
CREATE INDEX idx_bp_simulation_week_id3 ON  base_pricing.bp_simulation_week USING btree (product_id);
CREATE INDEX idx_bp_simulation_week_id4 ON  base_pricing.bp_simulation_week USING btree (channel_id);
CREATE INDEX idx_bp_simulation_week_id5 ON  base_pricing.bp_simulation_week USING btree (segment_id);
CREATE INDEX idx_bp_simulation_week_main ON  base_pricing.bp_simulation_week USING btree (product_id, channel_id, segment_id, week_start_date);