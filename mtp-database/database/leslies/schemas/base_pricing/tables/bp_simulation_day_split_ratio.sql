
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_simulation_day_split_ratio_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_simulation_day_split_ratio_10

drop table if exists base_pricing.bp_simulation_day_split_ratio;
CREATE TABLE base_pricing.bp_simulation_day_split_ratio (
	l0_cid int4 NOT NULL,
	l1_cid int4 NOT NULL,
	l2_cid int4 NOT NULL,
	l3_cid int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	week_start_date date NOT NULL,
	"date" date NOT NULL,
	day_split_ratio float4 NOT NULL
);
CREATE INDEX bp_simulation_day_split_ratio_idx1 ON base_pricing.bp_simulation_day_split_ratio USING btree (l0_cid, l1_cid, l2_cid, l3_cid, channel_id, segment_id, week_start_date);