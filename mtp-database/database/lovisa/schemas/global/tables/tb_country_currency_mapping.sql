--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:tb_country_currency_mapping_15092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_country_currency_mapping

CREATE TABLE "global".tb_country_currency_mapping (
	id int4 NOT NULL,
	territory_id int4 NOT NULL,
	country_id int4 NOT NULL,
	currency_id int4 NOT NULL,
	dominating_currency_id int4 NOT NULL,
	default_currency_id int4 NOT NULL,
	CONSTRAINT tb_country_currency_mapping_pk PRIMARY KEY (territory_id, country_id, currency_id)
);