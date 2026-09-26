
--liquibase formatted sql
--changeset mayank.mukundam:sourcing_class_master_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sourcing_class_master_ua
CREATE TABLE source_smart.sourcing_class_master_ua (
	sourcing_class_id varchar(50) NULL,
	sourcing_class_name varchar(50) NULL,
	category varchar(50) NULL
);