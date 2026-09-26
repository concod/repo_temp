--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_currency_master  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_master

CREATE TABLE IF NOT EXISTS pricesmart.tb_currency_master (
	currency_id int4 NOT NULL,
	currency_name text NULL,
	currency_symbol text NULL,
	CONSTRAINT pk_currency_master PRIMARY KEY (currency_id)
);