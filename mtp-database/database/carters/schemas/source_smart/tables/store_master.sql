--liquibase formatted sql
--changeset liquibase:store_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_master
CREATE TABLE source_smart.store_master (
	store_code varchar(255) NOT NULL,
	store_name varchar(255) NOT NULL,
	special_classification varchar(255) NOT NULL,
	active bool NOT NULL,
	open_date date NULL,
	close_date date NULL,
	channel varchar(255) NULL,
	channel_group varchar(255) NULL,
	s0_name varchar(255) NULL,
	s1_name varchar(255) NULL,
	s2_name varchar(255) NULL,
	s3_name varchar(255) NULL,
	s4_name varchar(255) NULL,
	s0_id varchar(255) NULL,
	s1_id varchar(255) NULL,
	s2_id varchar(255) NULL,
	district varchar(255) NULL,
	zipcode varchar(255) NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	s3_id varchar(255) NULL,
	s4_id varchar(255) NULL,
	CONSTRAINT store_master_pkey PRIMARY KEY (store_code)
);