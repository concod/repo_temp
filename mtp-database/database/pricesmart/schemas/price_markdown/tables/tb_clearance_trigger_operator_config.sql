--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:tb_clearance_trigger_operator_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_clearance_trigger_operator_config

CREATE TABLE price_markdown.tb_clearance_trigger_operator_config (
	operator_id int4 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START 1 CACHE 1 NO CYCLE) NOT NULL,
	operator_name text NOT NULL,
	operator_display_name text NOT NULL,
	CONSTRAINT tb_clearance_trigger_operator_config_pkey PRIMARY KEY (operator_id)
);