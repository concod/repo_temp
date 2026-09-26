--liquibase formatted sql
--changeset omkarramkrishna.sase@impactanalytics.co:plan_attributes_list stripComments:false splitStatements:false context:Release_1_0 labels:plan_attributes_list
--comment: initial changeset for plan_attributes_list
CREATE TABLE plan_smart.plan_attributes_list (
	attribute_name varchar NOT NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" varchar NOT NULL,
	CONSTRAINT pk_plan_attributes_list PRIMARY KEY (attribute_name)
);