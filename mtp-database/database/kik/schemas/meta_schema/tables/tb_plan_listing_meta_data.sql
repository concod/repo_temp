--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_plan_listing_meta_data stripComments:false splitStatements:false context:Release_1_0 labels:tb_plan_listing_meta_data
--comment: initial changeset for tb_plan_listing_meta_data
CREATE TABLE meta_schema.tb_plan_listing_meta_data (
	plan_code int4 NOT NULL,
	table_header jsonb NULL,
	flattened_table_header jsonb NULL,
	table_header_mapping jsonb NULL,
	CONSTRAINT tb_plan_listing_meta_data_pkey PRIMARY KEY (plan_code)
);


--changeset archa.prakash@impactanalytics.co:tb_kpi_master_chg3 stripComments:false splitStatements:false context:Release_1_1 labels:table_header_key_to_hash
--comment: added columns table_header_key_to_hash,hash_to_table_header_key
ALTER TABLE meta_schema.tb_plan_listing_meta_data ADD COLUMN table_header_key_to_hash jsonb NULL;
ALTER TABLE meta_schema.tb_plan_listing_meta_data ADD COLUMN hash_to_table_header_key jsonb NULL;
