--liquibase formatted sql
--changeset liquibase:tb_country_currency_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_country_currency_mapping

CREATE TABLE "global".tb_country_currency_mapping (
	id int4 NOT NULL,
	country_id int4 NOT NULL,
	currency_id int4 NOT NULL,
	CONSTRAINT tb_country_currency_mapping_pkey PRIMARY KEY (id)
);