--liquibase formatted sql
--changeset liquibase:ob_base_data_task_tracking stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ob_base_data_task_tracking
CREATE TABLE inventory_smart.ob_base_data_task_tracking (
	task_id varchar NOT NULL PRIMARY KEY,
	allocation_plans text[] NOT NULL,
	partition_hierarchy_value varchar NOT NULL,
	merge_status varchar NOT NULL,
	plans_created_at_date date NOT NULL,
	status_updated_at timestamptz NOT NULL DEFAULT now()
);
