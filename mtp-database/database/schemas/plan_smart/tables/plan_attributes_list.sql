--liquibase formatted sql
--changeset liquibase:plan_attributes_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_attributes_list
CREATE TABLE plan_smart.plan_attributes_list (
	attribute_name varchar NOT NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" varchar NOT NULL
);

--changeset subhash.pophale@impactanalytics.co:plan_attributes_list_alter_1 stripComments:false splitStatements:false context:Release_1_2 labels:MTP-19948
--comment: Added missing primary key on the table
--Rollback: alter table plan_smart.plan_attributes_list drop constraint pk_plan_attributes_list;
ALTER TABLE plan_smart.plan_attributes_list ADD CONSTRAINT pk_plan_attributes_list PRIMARY KEY (attribute_name);
