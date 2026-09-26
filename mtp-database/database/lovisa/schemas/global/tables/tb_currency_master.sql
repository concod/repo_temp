--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:tb_currency_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_master_2

CREATE TABLE IF NOT EXISTS "global".tb_currency_master (
	currency_id int4 NOT NULL,
	currency_name text NOT NULL,
	currency_symbol varchar NOT NULL,
	CONSTRAINT tb_currency_master_pk_3 PRIMARY KEY (currency_id)
);

