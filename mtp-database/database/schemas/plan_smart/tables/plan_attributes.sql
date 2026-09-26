--liquibase formatted sql
--changeset liquibase:plan_attributes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_attributes
CREATE TABLE plan_smart.plan_attributes (
	attribute_value varchar NOT NULL,
	attribute_name varchar NOT NULL,
	plan_code int4 NOT NULL,
	CONSTRAINT plan_smart_attributes_un UNIQUE (plan_code, attribute_name),
	CONSTRAINT plan_smart_plan_attribute_name_lc_check CHECK (((attribute_name)::text = lower((attribute_name)::text)))
);


-- plan_smart.plan_attributes foreign keys

ALTER TABLE plan_smart.plan_attributes ADD CONSTRAINT plan_attribute_fk FOREIGN KEY (plan_code) REFERENCES plan_smart.plan_master(plan_code) ON DELETE CASCADE;