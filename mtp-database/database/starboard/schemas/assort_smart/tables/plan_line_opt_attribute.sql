--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_line_opt_attribute stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_line_opt_attribute

CREATE TABLE IF NOT EXISTS assort_smart.plan_line_opt_attribute (
	id bigserial NOT NULL,
	plan_code int8 NULL,
	hierarchy_code varchar NULL,
	final_level varchar NULL,
	attribute_name varchar NULL,
	attribute_value varchar NULL,
	CONSTRAINT plan_line_opt_attribute_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_plan_line_opt_attribute_plan_code ON assort_smart.plan_line_opt_attribute USING btree (plan_code);
