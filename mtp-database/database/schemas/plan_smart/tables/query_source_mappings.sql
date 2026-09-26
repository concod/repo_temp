--liquibase formatted sql
--changeset liquibase:query_source_mappings stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for query_source_mappings
CREATE TABLE plan_smart.query_source_mappings (
	input_query_level int4 NOT NULL,
	plan_type varchar NOT NULL,
	plan_status int4 NOT NULL,
	plan_table varchar(50) NOT NULL,
	product_hierarchy_filter_level int4 NOT NULL,
	plan_upd_table varchar NULL,
	plan_table_ce_enabled bool NULL,
	plan_upd_table_ce_enabled bool NULL,
	gbq_plan_table_ly varchar NULL,
	gbq_plan_table_iaf varchar NULL,
	gbq_plan_table_ty varchar NULL,
	CONSTRAINT pk_query_source_mappings PRIMARY KEY (input_query_level, plan_type, plan_status, plan_table, product_hierarchy_filter_level)
);

--changeset devaraj.jagannath@impactanalytics.co:query_source_mappings_alter1 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-23719
--comment: added a new column gbq_plan_table_lly
--Rollback: alter table  plan_smart.query_source_mappings drop column gbq_plan_table_lly;
ALTER TABLE plan_smart.query_source_mappings ADD COLUMN gbq_plan_table_lly varchar null;