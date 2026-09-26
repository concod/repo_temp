--liquibase formatted sql
--changeset vaibhav.singh@impactanalytics.co:bp_simulation_store_split_ratio_month_v1 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:bp_simulation_store_split_ratio_month
--comment: changeset for base_pricing.bp_simulation_store_split_ratio_month

DROP TABLE IF EXISTS base_pricing.bp_simulation_store_split_ratio_month;

CREATE TABLE base_pricing.bp_simulation_store_split_ratio_month (
	l0_cid int4 NOT NULL,
	l1_cid int4 NOT NULL,
	l2_cid int4 NOT NULL,
	l3_cid int4 NOT NULL,
	store_id int4 NOT NULL,
	channel_id int4 NOT NULL,
	segment_id int4 NOT NULL,
	fiscal_month int4 NOT NULL,
	fiscal_month_name text NOT NULL,
	fiscal_year int4 NOT NULL,
	store_split_ratio float4 NOT NULL,
	start_date date NOT NULL,
	end_date date NOT NULL
)
PARTITION BY RANGE (start_date);
