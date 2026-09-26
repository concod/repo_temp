
--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.plan_attributes_list stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for status_details




CREATE TABLE IF not exists assort_smart.plan_attributes_list (
	attribute_name name COLLATE "C" NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name COLLATE "C" NULL
);