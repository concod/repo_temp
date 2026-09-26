--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:bp_store_master_v2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_store_master_v2

-- DDL:
CREATE TABLE base_pricing.bp_store_master (
	s0_name varchar NULL,
	s0_id varchar NULL,
	s0_cid int4 NULL,
	s1_name varchar NULL,
	s1_id varchar NULL,
	s1_cid int4 NULL,
	s2_name varchar NULL,
	s2_id varchar NULL,
	s2_cid int4 NULL,
	s3_name varchar NULL,
	s3_id varchar NULL,
	s3_cid int4 NULL,
	s4_name varchar NULL,
	s4_id varchar NULL,
	s4_cid int4 NULL,
	s5_name varchar NULL,
	s5_id varchar NULL,
	s5_cid int4 NULL,
	store_code varchar NULL,
	store_name varchar NULL,
	store_status bool NULL,
	active bool NULL,
	open_date timestamp NULL,
	close_date timestamp NULL,
	store_id int4 NOT NULL,
	CONSTRAINT bp_store_master_pkey PRIMARY KEY (store_id)
);