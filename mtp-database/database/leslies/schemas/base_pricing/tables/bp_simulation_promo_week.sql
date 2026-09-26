
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_promo_week_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_promo_week_10

drop table if exists base_pricing.bp_simulation_promo_week;
CREATE TABLE base_pricing.bp_simulation_promo_week (
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	promo_source int4 NULL,
	reference_price float4 NULL,
	weighted_promo_percent float4 NULL,
	effective_reference_price float4 NULL,
	CONSTRAINT bp_simulation_promo_week_prk PRIMARY KEY (product_id, channel_id, segment_id, week_start_date)
);
CREATE INDEX bp_simulation_promo_week_idx ON base_pricing.bp_simulation_promo_week USING btree (product_id, channel_id, segment_id, week_start_date);
CREATE INDEX idx_bp_simulation_promo_week_prod_seg_week ON base_pricing.bp_simulation_promo_week USING btree (product_id, segment_id, week_start_date);