--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:tb_query_catalog_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_query_catalog
CREATE TABLE pricesmart.tb_query_catalog (
	query_id serial4 NOT NULL,
	query_name varchar(255) NOT NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT tb_query_catalog_pkey PRIMARY KEY (query_id),
	CONSTRAINT tb_query_catalog_query_name_key UNIQUE (query_name)
);
