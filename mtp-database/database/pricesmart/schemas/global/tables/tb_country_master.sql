--liquibase formatted sql
--changeset liquibase:tb_country_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_country_master


CREATE TABLE "global".tb_country_master (
	country_id int4 NOT NULL,
	country_code varchar(10) NOT NULL,
	country_name varchar(100) NULL,
	CONSTRAINT tb_country_master_country_code_key UNIQUE (country_code),
	CONSTRAINT tb_country_master_pkey PRIMARY KEY (country_id)
);