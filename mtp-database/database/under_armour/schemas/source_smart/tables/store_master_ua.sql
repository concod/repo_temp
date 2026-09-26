--liquibase formatted sql
--changeset liquibase:store_master_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_master_ua

CREATE TABLE source_smart.store_master_ua (
	store_code varchar(255) NOT NULL,
	store_name varchar(255) NOT NULL
);