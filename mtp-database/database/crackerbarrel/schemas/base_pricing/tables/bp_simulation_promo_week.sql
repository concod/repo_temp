--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_promo_week stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_promo_week

CREATE TABLE base_pricing.bp_simulation_promo_week (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	promo_source int4 NOT NULL,
	reference_price float4 NULL,
	weighted_promo_percent float4 NULL,
	effective_reference_price float4 NULL,
	CONSTRAINT bp_simulation_promo_week_prk PRIMARY KEY (product_id, store_id, segment_id, week_start_date)
)
PARTITION BY RANGE (week_start_date);

CREATE INDEX idx_bp_simulation_promo_week_id1 ON  base_pricing.bp_simulation_promo_week USING btree (week_start_date);
CREATE INDEX idx_bp_simulation_promo_week_id2 ON  base_pricing.bp_simulation_promo_week USING btree (product_id);
CREATE INDEX idx_bp_simulation_promo_week_id3 ON  base_pricing.bp_simulation_promo_week USING btree (store_id);
CREATE INDEX idx_bp_simulation_promo_week_id4 ON  base_pricing.bp_simulation_promo_week USING btree (channel_id);
CREATE INDEX idx_bp_simulation_promo_week_id5 ON  base_pricing.bp_simulation_promo_week USING btree (segment_id);
CREATE INDEX idx_bp_simulation_promo_week_main ON  base_pricing.bp_simulation_promo_week USING btree (product_id, channel_id, segment_id, week_start_date);