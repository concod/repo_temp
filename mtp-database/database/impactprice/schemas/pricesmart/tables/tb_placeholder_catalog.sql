--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:tb_placeholder_catalog_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_placeholder_catalog
CREATE TABLE pricesmart.tb_placeholder_catalog (
	placeholder_id serial4 NOT NULL,
	placeholder_name varchar(100) NOT NULL,
	placeholder_type varchar(50) NOT NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT tb_placeholder_catalog_pkey PRIMARY KEY (placeholder_id),
	CONSTRAINT tb_placeholder_catalog_placeholder_name_key UNIQUE (placeholder_name)
);
