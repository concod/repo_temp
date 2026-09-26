--liquibase formatted sql
--changeset liquibase:aggregation_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_time_attributes
CREATE TABLE "global".aggregation_time_attributes (
	aggregation_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date NOT NULL DEFAULT '1990-01-01'::date,
	end_time date NOT NULL DEFAULT '2045-12-31'::date,
	aggregation_time_attr_id serial8 NOT NULL,
	CONSTRAINT aggregation_time_attributes_check CHECK ((end_time >= start_time))
);

--changeset kailash.yadav@impactanalytics.co:product_mapping_product_store stripComments:false splitStatements:false context:change_log labels:updated_by_column_add
--comment: change set to add column updated_by
ALTER TABLE "global".aggregation_time_attributes ADD updated_by int4 NULL;
ALTER TABLE "global".aggregation_time_attributes ADD CONSTRAINT aggregation_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

--changeset akshay.jain:aggregation_time_attributes_updated_at stripComments:false splitStatements:false context:first_commit labels:aggregation_time_attributes_1
--comment: added updated_at column in aggregation time attributes
alter table "global".aggregation_time_attributes add column updated_at timestamptz NULL;