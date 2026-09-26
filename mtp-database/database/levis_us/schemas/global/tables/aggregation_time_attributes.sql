--liquibase formatted sql
--changeset liquibase:aggregation_time_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for aggregation_time_attributes
CREATE TABLE "global".aggregation_time_attributes (
	aggregation_code varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	start_time date DEFAULT '1990-01-01'::date NOT NULL,
	end_time date DEFAULT '2045-12-31'::date NOT NULL,
	aggregation_time_attr_id bigserial NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	CONSTRAINT aggregation_time_attributes_check CHECK ((end_time >= start_time)),
	CONSTRAINT aggregation_time_attributes_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

--changeset himansh.bhardwaj:adding primary_key as well stripComments:false splitStatements:false context:first_commit labels:aggregation_time_attributes_1
--comment: adding primary_key
ALTER TABLE global.aggregation_time_attributes
ADD CONSTRAINT aggregation_time_attributes_pk
PRIMARY KEY (aggregation_code, attribute_name, start_time);

--changeset himansh.bhardwaj:one more constraint stripComments:false splitStatements:false context:first_commit labels:aggregation_time_attributes_1
--comment: one more constraint
ALTER TABLE global.aggregation_time_attributes
ADD CONSTRAINT uq_aggregation_attr_start
UNIQUE (aggregation_code, attribute_name, start_time);
