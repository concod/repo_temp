--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_attributes stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for status_details


CREATE TABLE if not exists assort_smart.plan_attributes (
	plan_code int4 NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT assort_plan_attribute_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text))),
	CONSTRAINT plan_attributes_un UNIQUE (plan_code, attribute_name)
);

--changeset ezhil.kannan@impactanalytics.co:add_index_plan_attributes_plan_code_attr_tommy stripComments:false splitStatements:false context:perf_optimization labels:alter_table
--comment: Add explicit index on (plan_code, attribute_name) for fetch-optimization-data performance
CREATE INDEX IF NOT EXISTS idx_plan_attributes_plan_code_attr ON assort_smart.plan_attributes (plan_code, attribute_name);