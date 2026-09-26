--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_country_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_country_master


CREATE TABLE "global".tb_country_master (
	country_id int4 NOT NULL,
	country_code text NULL,
	country_name text NULL,
	CONSTRAINT tb_country_master_pk PRIMARY KEY (country_id)
);

--changeset anshika.mungiya@impactanalytics.co:tb_country_master_June6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_country_master_June6

ALTER TABLE "global".tb_country_master
DROP CONSTRAINT tb_country_master_pk;

ALTER TABLE "global".tb_country_master
ALTER COLUMN country_id DROP NOT NULL;