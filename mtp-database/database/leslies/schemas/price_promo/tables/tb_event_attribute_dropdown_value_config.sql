--liquibase formatted sql
--changeset liquibase:tb_event_attribute_dropdown_value_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_event_attribute_dropdown_value_config
CREATE TABLE price_promo.tb_event_attribute_dropdown_value_config (
	config_type text NOT NULL,
	display_name text NOT NULL,
	config_value varchar NULL,
	CONSTRAINT tb_event_attribute_dropdown_value_config_pkey PRIMARY KEY (config_type, display_name)
);