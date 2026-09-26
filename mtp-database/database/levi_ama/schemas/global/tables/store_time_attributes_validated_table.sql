--liquibase formatted sql
--changeset liquibase:store_time_attributes_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_time_attributes_validated_table

-- DROP TABLE IF EXISTS global.store_time_attributes_validated_table;
CREATE TABLE global.store_time_attributes_validated_table (
	store_code varchar NOT NULL,
	attribute_name varchar NULL,
	attribute_value bool NULL,
	start_time date NULL,
	end_time date NULL,
	store_time_attr_id varchar NULL,
	updated_at varchar NULL,
	updated_by varchar NULL,
	CONSTRAINT store_time_attributes_validated_pk PRIMARY KEY (store_code)
);