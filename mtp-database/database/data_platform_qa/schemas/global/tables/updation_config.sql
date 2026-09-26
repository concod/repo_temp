--liquibase formatted sql
--changeset liquibase:updation_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for updation_config
CREATE TABLE IF NOT EXISTS "global".updation_config (
	updation_key int4 NOT NULL,
	updation_value bool NOT NULL,
	description varchar NULL,
	CONSTRAINT updation_config_pk PRIMARY KEY (updation_key)
);