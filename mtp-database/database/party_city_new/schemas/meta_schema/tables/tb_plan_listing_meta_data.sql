--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_plan_listing_meta_data stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_plan_listing_meta_data

CREATE TABLE meta_schema.tb_plan_listing_meta_data (
	plan_code int4 NOT NULL,
	table_header jsonb NULL,
	flattened_table_header jsonb NULL,
	table_header_mapping jsonb NULL,
	table_header_key_to_hash jsonb NULL,
	hash_to_table_header_key jsonb NULL,
	CONSTRAINT tb_plan_listing_meta_data_pkey PRIMARY KEY (plan_code)
);