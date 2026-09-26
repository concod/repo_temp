--liquibase formatted sql
--changeset liquibase:aggregation_time_attributes_validated_table stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_time_attributes_validated_table

-- DROP TABLE IF EXISTS global.aggregation_time_attributes_validated_table;
CREATE TABLE global.aggregation_time_attributes_validated_table (
	aggregation_code varchar NOT NULL,
	attribute_name varchar NULL,
	attribute_value varchar NULL,
	start_time date NULL,
	end_time date NULL,
	aggregation_time_attr_id varchar NULL,
	updated_by varchar NULL,
	updated_at varchar NULL,
	feed_updated_date date NULL,
	CONSTRAINT aggregation_time_attributes_validated_pk PRIMARY KEY (aggregation_code)
);