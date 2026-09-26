--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.plan_attributes_list stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for plan_attributes_list


CREATE TABLE IF not exists assort_smart.plan_attributes_list (
	attribute_name name COLLATE "C" NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name COLLATE "C" NULL
);