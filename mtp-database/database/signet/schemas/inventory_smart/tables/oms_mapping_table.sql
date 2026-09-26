--liquibase formatted sql
--changeset liquibase:oms_mapping_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_mapping_table
CREATE TABLE inventory_smart.oms_mapping_table (
	value varchar NULL,
	variable varchar NULL,
	new_value varchar NULL,
	banner varchar NULL,
	true_false varchar NULL
);