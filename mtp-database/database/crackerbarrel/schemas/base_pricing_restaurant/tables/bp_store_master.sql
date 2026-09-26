--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_store_master_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_store_master_1

DROP TABLE IF EXISTS base_pricing_restaurant.bp_store_master CASCADE;

CREATE TABLE base_pricing_restaurant.bp_store_master (
	store_id int4 NOT NULL,
	s0_name varchar(100) NULL,
	s0_cid int4 NULL,
	s0_id varchar(15) NULL,
	s1_name varchar(100) NULL,
	s1_cid int4 NULL,
	s1_id varchar(15) NULL,
	s2_name varchar(100) NULL,
	s2_cid int4 NULL,
	s2_id varchar(15) NULL,
	s3_name varchar(100) NULL,
	s3_cid int4 NULL,
	s3_id varchar(15) NULL,
	s4_name varchar(100) NULL,
	s4_cid int4 NULL,
	s4_id varchar(15) NULL,
	s5_name varchar(100) NULL,
	s5_cid int4 NULL,
	s5_id varchar(15) NULL,
	store_code varchar(15) NULL,
	store_name varchar(100) NULL,
	active bool NULL,
	price_zone text NULL,
	open_date date NULL,
	close_date date NULL,
	address text NULL,
	city text NULL,
	CONSTRAINT bp_store_master_pkey PRIMARY KEY (store_id)
);