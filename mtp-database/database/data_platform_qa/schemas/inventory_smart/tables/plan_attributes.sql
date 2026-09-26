--liquibase formatted sql
--changeset liquibase:plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_attributes
CREATE TABLE inventory_smart.plan_attributes (
	plan_code text NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT plan_smart_attributes_un UNIQUE (plan_code, attribute_name),
	CONSTRAINT plan_smart_plan_attribute_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text)))
);
ALTER TABLE inventory_smart.plan_attributes ADD CONSTRAINT plan_attribute_fk FOREIGN KEY (plan_code) REFERENCES inventory_smart.plan_master(plan_code) ON DELETE CASCADE;
CREATE INDEX plan_attributes_plan_code_idx ON inventory_smart.plan_attributes (plan_code);
