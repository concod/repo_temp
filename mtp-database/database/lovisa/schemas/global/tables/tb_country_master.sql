--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_country_master_15092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_country_master

CREATE TABLE "global".tb_country_master (
	country_id int4 NOT NULL,
	country_code text NOT NULL,
	country_name text NOT NULL,
	CONSTRAINT tb_country_master_pk PRIMARY KEY (country_id)
);