
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_week_v5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_week_v5

CREATE TABLE base_pricing.bp_simulation_week (
	product_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	base_percentage float4 NOT NULL,
	price_point float4 NOT NULL,
	sales_units float4 NOT NULL,
	elasticity_bp float4 NOT NULL,
	CONSTRAINT bp_simulation_week_pk PRIMARY KEY (product_id, channel_id, segment_id, week_start_date)
);
CREATE INDEX bp_simulation_week_idx1 ON base_pricing.bp_simulation_week USING btree (product_id, channel_id, week_start_date);