--liquibase formatted sql
--changeset liquibase:product_time_attributes_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_time_attributes_validated_table

-- DROP TABLE IF EXISTS global.product_time_attributes_validated_table;
CREATE TABLE global.product_time_attributes_validated_table (
	product_code varchar NOT NULL,
	attribute_name varchar NULL,
	attribute_value varchar NULL,
	start_time date NULL,
	end_time date NULL,
	product_time_attr_id varchar NULL,
	updated_by varchar NULL,
	updated_at varchar NULL,  
	feed_updated_date date NULL,
	CONSTRAINT product_time_attributes_validated_pk PRIMARY KEY (product_code)
);