--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_store_split_ratio stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_store_split_ratio

CREATE TABLE base_pricing.bp_simulation_store_split_ratio (
	l0_cid int4 NOT NULL,
	l1_cid int4 NOT NULL,
	l2_cid int4 NOT NULL,
	l3_cid int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL,
	CONSTRAINT bp_simulation_store_split_ratio_prk PRIMARY KEY (l0_cid, l1_cid, l2_cid, l3_cid, store_id, segment_id, week_start_date)
)
PARTITION BY RANGE (week_start_date);

CREATE INDEX idx_bp_simulation_store_split_ratio_id1 ON  base_pricing.bp_simulation_store_split_ratio USING btree (week_start_date);
CREATE INDEX idx_bp_simulation_store_split_ratio_id2 ON  base_pricing.bp_simulation_store_split_ratio USING btree (l0_cid, l1_cid, l2_cid, l3_cid);
CREATE INDEX idx_bp_simulation_store_split_ratio_id3 ON  base_pricing.bp_simulation_store_split_ratio USING btree (store_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_id4 ON  base_pricing.bp_simulation_store_split_ratio USING btree (channel_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_id5 ON  base_pricing.bp_simulation_store_split_ratio USING btree (segment_id);
CREATE INDEX idx_bp_simulation_store_split_ratio_main ON  base_pricing.bp_simulation_store_split_ratio USING btree (l0_cid, l1_cid, l2_cid, l3_cid, channel_id, segment_id, week_start_date);