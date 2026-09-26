--liquibase formatted sql
--changeset liquibase:external_feature_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for external_feature_master
CREATE table "global".external_feature_master (
	feature_id serial4 NOT NULL,
	feature varchar NOT NULL,
	method_code varchar NOT NULL,
	CONSTRAINT feature_master_pk PRIMARY KEY (feature_id)
);
