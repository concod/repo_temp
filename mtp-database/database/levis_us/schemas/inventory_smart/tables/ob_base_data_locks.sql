--liquibase formatted sql
--changeset liquibase:ob_base_data_locks stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ob_base_data_locks
CREATE TABLE inventory_smart.ob_base_data_locks (
	lock_key bigint NOT NULL PRIMARY KEY,
	task_id varchar NOT NULL,
	partition_hierarchy_value varchar NOT NULL,
	acquired_at timestamptz NOT NULL DEFAULT now()
);
