

--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co :assort_smart.hindsight_plan_attributes_list_true stripComments:false splitStatements:false context:MTP-51802 labels:add_missing_cols
--comment: initial changeset for hindsight_plan_attributes_list 

CREATE TABLE IF not exists assort_smart.hindsight_plan_attributes_list (
	attribute_name name COLLATE "C" NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level int4 NULL,
	"datatype" name COLLATE "C" NULL
);