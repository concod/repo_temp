--liquibase formatted sql
--changeset liquibase:construction_type_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for construction_type_master
CREATE TABLE source_smart.construction_type_master (
	construction_type_id varchar(255) NOT NULL,
	type_name varchar(255) NULL,
	category varchar(255) NULL,
	hs_code varchar(255) NULL,
	CONSTRAINT ctm_pk PRIMARY KEY (construction_type_id)
);