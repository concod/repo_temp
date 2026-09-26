--liquibase formatted sql
--changeset liquibase:sourcing_class_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sourcing_class_master
CREATE TABLE source_smart.sourcing_class_master (
	sourcing_class_id varchar(20) NOT NULL,
	sourcing_class_name varchar(255) NOT NULL,
	category varchar(100) NOT NULL,
	CONSTRAINT sourcing_class_master_pkey PRIMARY KEY (sourcing_class_id)
);