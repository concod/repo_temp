--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_severity_config-1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_severity_config-1

CREATE TABLE price_markdown.tb_custom_alerts_severity_config (
	severity_id int4 NOT NULL,
	severity_display_name text NOT NULL,
	CONSTRAINT tb_custom_alerts_severity_config_pkey PRIMARY KEY (severity_id)
);