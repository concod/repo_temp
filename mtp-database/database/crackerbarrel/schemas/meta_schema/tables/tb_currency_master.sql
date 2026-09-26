--liquibase formatted sql
--changeset lokesh.kumar@impactanalytics.co:tb_currency_master stripComments:false splitStatements:false context:Release_1_0 labels:MTP-69900
--comment: initial changeset for tb_currency_master

CREATE TABLE meta_schema.tb_currency_master (
	currency_name varchar(100) NOT NULL,
	symbol varchar(10) NULL,
	currency_code varchar(10) NULL,
	look_up_definition _varchar DEFAULT '{}'::character varying[] NOT NULL
);

--changeset lokesh.kumar@impactanalytics.co:tb_currency_master_alter_1 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-69900
--comment: made currency_code as primary key
ALTER TABLE meta_schema.tb_currency_master ADD CONSTRAINT tb_currency_master_pkey PRIMARY KEY (currency_code);