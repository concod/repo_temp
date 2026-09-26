--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_store_split_kvi_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_store_split_kvi_v2

CREATE TABLE base_pricing.bp_simulation_store_split_kvi (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL,
	CONSTRAINT bp_simulation_store_split_kvi_pk PRIMARY KEY (product_id, store_id, segment_id, week_start_date)
);
CREATE INDEX bp_simulation_store_split_kvi_idx1 ON base_pricing.bp_simulation_store_split_kvi USING btree (product_id, segment_id, week_start_date);