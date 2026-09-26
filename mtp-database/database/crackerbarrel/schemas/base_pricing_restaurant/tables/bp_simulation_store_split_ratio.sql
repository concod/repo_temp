
--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:bp_simulation_store_split_ratio_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_simulation_store_split_ratio_2

DROP TABLE IF EXISTS base_pricing_restaurant.bp_simulation_store_split_ratio;

CREATE TABLE base_pricing_restaurant.bp_simulation_store_split_ratio (
	l0_cid int4 NOT NULL,
	l1_cid int4 NOT NULL,
	l2_cid int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL,
	CONSTRAINT bp_simulation_store_split_ratio_prk PRIMARY KEY (l0_cid, l1_cid, l2_cid, store_id, segment_id, week_start_date)
)
PARTITION BY RANGE (week_start_date);
CREATE INDEX idx_bp_simulation_store_split_ratio_id1 ON ONLY base_pricing_restaurant.bp_simulation_store_split_ratio USING btree (store_id);