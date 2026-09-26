
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_store_split_ratio_kvi_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_store_split_ratio_kvi_10

Drop table if exists base_pricing.bp_simulation_store_split_ratio_kvi;


CREATE TABLE base_pricing.bp_simulation_store_split_ratio_kvi (
	product_id int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL
);
CREATE INDEX bp_simulation_store_split_ratio_kvi_idx1 ON base_pricing.bp_simulation_store_split_ratio_kvi USING btree (product_id, store_id, channel_id, segment_id, week_start_date);
CREATE INDEX bp_simulation_store_split_ratio_kvi_idx2 ON base_pricing.bp_simulation_store_split_ratio_kvi USING btree (product_id, channel_id, segment_id);