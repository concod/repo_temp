--liquibase formatted sql
--changeset liquibase:attribute_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for attribute_mapping
CREATE TABLE visual_line_planning.attribute_mapping (
	l0_name varchar(255) NULL,
	l1_name varchar(255) NULL,
	l2_name varchar(255) NULL,
	a0_name varchar(255) NULL,
	a1_name varchar(255) NULL,
	a2_name varchar(255) NULL
);