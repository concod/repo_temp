--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_metric_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_metric_config

CREATE TABLE price_markdown.tb_custom_alerts_metric_config (
	metric_id int4 NOT NULL,
	metric_name text NOT NULL,
	metric_display_name text NOT NULL,
	CONSTRAINT tb_custom_alerts_metric_config_pkey PRIMARY KEY (metric_id)
);
