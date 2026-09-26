--liquibase formatted sql
--changeset liquibase:allocation_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_log
CREATE TABLE inventory_smart.allocation_log (
	allocation_id varchar(255) NOT NULL,
	task_name varchar(255) NULL,
	status varchar(255) NULL,
	message varchar NULL,
	created_at timestamptz NOT NULL DEFAULT now()
);
