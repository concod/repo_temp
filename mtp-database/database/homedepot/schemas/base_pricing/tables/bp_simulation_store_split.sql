
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_store_split_v5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_store_split_v5


CREATE TABLE base_pricing.bp_simulation_store_split (
	l0_cid int4 NOT NULL,
	l1_cid int4 NOT NULL,
	l2_cid int4 NOT NULL,
	l3_cid int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	store_split_ratio float4 NOT NULL,
	CONSTRAINT bp_simulation_store_split_pk PRIMARY KEY (l0_cid, l1_cid, l2_cid, l3_cid, store_id, segment_id, week_start_date)
);
CREATE INDEX bp_simulation_store_split_idx1 ON base_pricing.bp_simulation_store_split USING btree (l0_cid, l1_cid, l2_cid, l3_cid, segment_id, week_start_date);