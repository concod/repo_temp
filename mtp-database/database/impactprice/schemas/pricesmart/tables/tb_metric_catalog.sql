--liquibase formatted sql
--changeset narendren.saravanan@impactanalytics.co:tb_metric_catalog_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_metric_catalog
CREATE TABLE pricesmart.tb_metric_catalog (
	metric_id serial4 NOT NULL,
	metric_name varchar(100) NOT NULL,
	metric_type varchar(20) NOT NULL,
	display_alias varchar(200) NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT tb_metric_catalog_pkey PRIMARY KEY (metric_id),
	CONSTRAINT tb_metric_catalog_metric_name_key UNIQUE (metric_name)
);
