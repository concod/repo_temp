--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_plan_listing_ui_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_plan_listing_ui_config

CREATE TABLE meta_schema.tb_plan_listing_ui_config (
	id serial4 NOT NULL,
	plan_type varchar(100) NULL,
	ui_config jsonb NOT NULL,
	table_header jsonb NULL,
	rollup_and_rolldown_mapping jsonb NULL,
	flattened_table_header jsonb NULL,
	CONSTRAINT tb_plan_listing_ui_config_pkey PRIMARY KEY (id)
);