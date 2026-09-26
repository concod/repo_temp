--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_plan_listing_table_header_config stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_plan_listing_table_header_config

CREATE TABLE meta_schema.tb_plan_listing_table_header_config (
	id serial4 NOT NULL,
	table_header_config jsonb NULL,
	plan_type varchar(100) NULL,
	CONSTRAINT tb_plan_listing_table_header_config_pkey PRIMARY KEY (id)
);