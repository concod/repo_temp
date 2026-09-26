--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_plan_listing_table_header_config stripComments:false splitStatements:false context:Release_1_0 labels:tb_plan_listing_table_header_config
--comment: initial changeset for tb_plan_listing_table_header_config
CREATE TABLE meta_schema.tb_plan_listing_table_header_config (
	id serial4 NOT NULL,
	table_header_config jsonb NULL,
	plan_type varchar(100) NULL,
	CONSTRAINT tb_plan_listing_table_header_config_pkey PRIMARY KEY (id)
);