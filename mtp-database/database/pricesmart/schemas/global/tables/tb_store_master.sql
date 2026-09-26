--liquibase formatted sql
--changeset liquibase:tb_store_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master
CREATE TABLE "global".tb_store_master (
	s0_name varchar NULL,
	s0_id int4 NULL,
	s1_name varchar NULL,
	s1_id int4 NULL,
	s2_name varchar NULL,
	s2_id int4 NULL,
	s3_name varchar NULL,
	s3_id int4 NULL,
	s4_name varchar NULL,
	s4_id int4 NULL,
	s5_name varchar NULL,
	s5_id int4 NULL,
	store_code int4 NULL,
	store_name text NULL,
	store_status varchar NULL,
	"type" varchar NULL,
	store_open_flag varchar NULL,
	active bool NULL,
	special_classification varchar NULL,
	climate_area varchar NULL,
	latitude float8 NULL,
	longitude float8 NULL,
	open_date timestamp NULL,
	close_date timestamp NULL,
	is_active int2 NULL,
	store_id int4 NOT NULL,
	CONSTRAINT tb_store_master_pk PRIMARY KEY (store_id)
);
CREATE INDEX tb_store_master_store_code_idx ON global.tb_store_master USING btree (store_code);


--changeset liquibase:tb_store_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_store_master

ALTER TABLE global.tb_store_master
ADD COLUMN ps_reco_store_hierarchy text
GENERATED ALWAYS AS (COALESCE(s0_id::text, '') || '_' || COALESCE(s1_id::text, '')) STORED;

