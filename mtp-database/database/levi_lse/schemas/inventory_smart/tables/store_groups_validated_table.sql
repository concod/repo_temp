--liquibase formatted sql
--changeset liquibase:store_groups_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_groups_validated_table

-- DROP TABLE IF EXISTS global.store_groups_validated_table;
CREATE TABLE global.store_groups_validated_table (
	sg_code int4 NULL,
	"name" varchar NULL,
	store_code varchar NOT NULL, -- PK columns must be NOT NULL
	CONSTRAINT store_groups_validated_pk PRIMARY KEY (store_code)
);