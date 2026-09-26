--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_country_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_country_master

CREATE TABLE IF NOT EXISTS "global".tb_country_master (
	country_id int4 NOT NULL,
	country_code text NOT NULL,
	country_name text NULL,
	CONSTRAINT pk_tb_country_master PRIMARY KEY (country_id, country_code)
);