--liquibase formatted sql
--changeset liquibase:product_profile_channel_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_profile_channel_mapping

CREATE TABLE inventory_smart.product_profile_channel_mapping (
	pp_code int4 NOT NULL,
	channel varchar NOT NULL,
	CONSTRAINT product_profile_channel_mapping_pk PRIMARY KEY (pp_code),
	CONSTRAINT product_profile_channel_mapping_product_profile_master_fk FOREIGN KEY (pp_code) REFERENCES inventory_smart.product_profile_master(pp_code) ON DELETE CASCADE
);