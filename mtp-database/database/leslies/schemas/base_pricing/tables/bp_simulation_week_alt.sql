--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_week_alt_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_week_alt_10

CREATE TABLE base_pricing.bp_simulation_week_alt (
	product_id int4 NULL,
	channel_id int4 NULL,
	segment_id int4 NULL,
	week_start_date date NULL,
	min_cost float4 NULL,
	base_percentage float4 NULL,
	sim_markup_percentage float4 NULL,
	price_point float4 NULL,
	sales_units float4 NULL,
	elasticity_bp float4 NULL,
	promo_elasticity float4 NULL,
	confidence float4 DEFAULT 0.8225 NOT NULL
);
CREATE INDEX idx_bp_simulation_week_alt_coverage ON base_pricing.bp_simulation_week_alt USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_bp_simulation_week_alt_main ON base_pricing.bp_simulation_week_alt USING btree (product_id, segment_id, week_start_date) INCLUDE (channel_id, min_cost, base_percentage, price_point, sales_units, elasticity_bp, promo_elasticity, confidence);
CREATE INDEX idx_bp_simulation_week_alt_prod_seg ON base_pricing.bp_simulation_week_alt USING btree (product_id, segment_id);
CREATE INDEX idx_bp_simulation_week_alt_prod_seg_week ON base_pricing.bp_simulation_week_alt USING btree (product_id, segment_id, week_start_date);