--liquibase formatted sql
--changeset liquibase:generic_master_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for generic_master_mapping
CREATE TABLE "global".generic_master_mapping (
	source_table varchar NULL,
	source_level varchar NULL,
	generic_mapping_table varchar NULL,
	destination_table varchar NULL,
	destination_level varchar NULL,
	to_be_ingested bool NULL,
	is_required_in_master bool NULL,
	persist_attributes_table bool NULL,
	persist_hierarchies_table bool NULL,
	cross_validations varchar NULL,
	pull_type varchar NULL,
	persist_to_postgres bool NULL,
	data_loss_threshold int2 NULL DEFAULT 5
);
