--liquibase formatted sql
--changeset kuldeep.rathore@impactanalytics.co:store_to_store_default_param_na_test stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.store_to_store_default_param_na_test

CREATE TABLE if not exists inventory_smart.store_to_store_default_param (
	attribute varchar NOT NULL,
	value varchar NOT NULL,
	CONSTRAINT store_to_store_default_param_pkey PRIMARY KEY (attribute)
);