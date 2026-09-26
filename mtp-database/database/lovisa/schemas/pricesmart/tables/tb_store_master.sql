--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics:tb_store_master_15092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for lovisa store_master

CREATE TABLE pricesmart.tb_store_master (
	s0_name text NULL,
	s0_id int4 NULL,
	s1_name text NULL,
	s1_id int4 NULL,
	s2_name text NULL,
	s2_id int4 NULL,
	s3_name text NULL,
	s3_id int4 NULL,
	s4_name text NULL,
	s4_id int4 NULL,
	s5_name text NULL,
	s5_id int4 NULL,
	store_code int4 NULL,
	store_name text NULL,
	store_status text NULL,
	store_type text NULL,
	store_open_flag bool NULL,
	active bool NULL,
	special_classification text NULL,
	climate_area text NULL,
	latitude float4 NULL,
	longitude float4 NULL,
	open_date date NULL,
	close_date date NULL,
	is_active int4 NOT NULL,
	store_id int4 NOT NULL,
	store_type_id int4 NULL,
	CONSTRAINT ps_tb_store_master_pk PRIMARY KEY (store_id)
);
CREATE INDEX ps_tb_store_master_s1_id_idx ON pricesmart.tb_store_master USING btree (s1_id);

--changeset keerthana.reddy@impactanalytics.co:tb_store_master_03102025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding store grade array columns

ALTER TABLE pricesmart.tb_store_master
ADD COLUMN store_grade text[] NULL,
ADD COLUMN store_grade_id int4[] NULL;

--changeset keerthana.reddy@impactanalytics.co:tb_store_master_06112025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add currency_id - country level currency
ALTER TABLE pricesmart.tb_store_master
ADD COLUMN currency_id INT4 NULL;
