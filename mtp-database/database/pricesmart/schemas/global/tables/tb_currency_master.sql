--liquibase formatted sql
--changeset liquibase:tb_currency_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_master

CREATE TABLE "global".tb_currency_master (
	currency_id int4 NOT NULL,
	currency_symbol text NOT NULL,
	currency_name text NOT NULL,
	CONSTRAINT tb_currency_master_pkey PRIMARY KEY (currency_id)
);