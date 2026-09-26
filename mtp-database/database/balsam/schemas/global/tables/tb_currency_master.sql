--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_currency_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_master

CREATE TABLE "global".tb_currency_master (
	currency_id int4 NOT NULL,
	currency_name text NULL,
	currency_symbol text NULL,
	CONSTRAINT tb_currency_master_pk PRIMARY KEY (currency_id)
);


--changeset anshika.mungiya@impactanalytics.co:tb_currency_master_June6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_currency_master_June6

ALTER TABLE "global".tb_currency_master
DROP CONSTRAINT tb_currency_master_pk;

ALTER TABLE "global".tb_currency_master
ALTER COLUMN currency_id DROP NOT NULL;