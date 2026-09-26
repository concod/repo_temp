--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_operator_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_operator_config

CREATE TABLE price_markdown.tb_custom_alerts_operator_config (
	operator_id int4 NOT NULL,
	operator_name varchar NOT NULL,
	operator_display_name text NOT NULL,
	CONSTRAINT tb_custom_alerts_operator_config_new_pkey PRIMARY KEY (operator_id)
);