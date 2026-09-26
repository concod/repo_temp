--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:rcl_constraint_master_attribute_list stripComments:false splitStatements:false context:RELEASE 1.0 labels:JIRA_NO 
--comment Add comment describing your change 
CREATE TABLE inventory_smart.rcl_constraint_master_attribute_list (
	attribute_name varchar NULL,
	is_hierarchy bool NULL,
	is_attribute bool NULL,
	is_main_col bool NULL,
	hierarchy_level text NULL,
	"datatype" text NULL,
	"label" varchar NULL,
	"order" int4 NULL
);
--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;

--liquibase formatted sql
--changeset anshuman.ghosh@impactanalytics.co:rcl_constraint_master_attribute_list_v1 stripComments:false splitStatements:false context:RELEASE 1.0 labels:JIRA_NO 
--comment Add comment describing your change 

ALTER TABLE inventory_smart.rcl_constraint_master_attribute_list RENAME COLUMN "order" TO order_of_display;

--rollback TYPE YOUR ROLLBACK IF POSSIBLE OR TYPE SELECT 1 ;