--liquibase formatted sql
--changeset liquibase:tb_currency_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_master

DROP TABLE IF EXISTS "global".tb_currency_master;

CREATE TABLE "global".tb_currency_master (	
	currency_id int4 null,
	currency_name varchar(50) NULL,
	currency_symbol varchar(10) NULL,
    CONSTRAINT tb_currency_master_pk PRIMARY KEY (currency_id)
);
