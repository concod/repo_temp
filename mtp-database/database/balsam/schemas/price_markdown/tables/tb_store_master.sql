--liquibase formatted sql
--changeset liquibase:tb_store_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master

CREATE TABLE price_markdown.tb_store_master (
	s0_name text NULL,
	s0_id text NULL,
	s1_name text NULL,
	s1_id text NULL,
	s2_name text NULL,
	s2_id text NULL,
	s3_name text NULL,
	s3_id text NULL,
	s4_name text NULL,
	s4_id text NULL,
	s5_name text NULL,
	s5_id text NULL,
	store_code text NULL,
	store_name text NULL,
	store_status text NULL,
	"type" text NULL,
	store_open_flag bool NULL,
	active bool NULL,
	special_classification text NULL,
	climate_area text NULL,
	latitude float4 NULL,
	longitude float4 NULL,
	open_date date NULL,
	close_date date NULL,
	is_active int4 NULL,
	store_id int4 NOT NULL,
	CONSTRAINT tb_store_master_pk PRIMARY KEY (store_id)
);


--changeset liquibase:tb_store_master_v20062025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master
ALTER TABLE price_markdown.tb_store_master
ALTER COLUMN s0_name TYPE varchar,
ALTER COLUMN s0_id TYPE int4 USING s0_id::integer,
ALTER COLUMN s1_name TYPE varchar,
ALTER COLUMN s1_id TYPE int4 USING s1_id::integer,
ALTER COLUMN s2_name TYPE varchar,
ALTER COLUMN s2_id TYPE int4 USING s2_id::integer,
ALTER COLUMN s3_name TYPE varchar,
ALTER COLUMN s3_id TYPE int4 USING s3_id::integer,
ALTER COLUMN s4_name TYPE varchar,
ALTER COLUMN s4_id TYPE int4 USING s4_id::integer,
ALTER COLUMN s5_name TYPE varchar,
ALTER COLUMN s5_id TYPE int4 USING s5_id::integer,
ALTER COLUMN store_code TYPE int4 USING store_code::integer,
ALTER COLUMN store_name TYPE varchar,
ALTER COLUMN store_status TYPE varchar,
ALTER COLUMN "type" TYPE varchar,
ALTER COLUMN special_classification TYPE varchar,
ALTER COLUMN climate_area TYPE varchar,
ALTER COLUMN latitude TYPE float8,
ALTER COLUMN longitude TYPE float8,
ALTER COLUMN open_date TYPE timestamp,
ALTER COLUMN close_date TYPE timestamp;
