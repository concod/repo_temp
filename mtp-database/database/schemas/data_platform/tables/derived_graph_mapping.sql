--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:derived_graph_mapping stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for derived graph mapping

CREATE TABLE IF NOT EXISTS data_platform.derived_graph_mapping (
	task_id varchar NULL,
	parent_id varchar NULL,
	tables_tobe_copied varchar NULL,
	is_deleted bool DEFAULT false NULL,
	created_by int4 NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	deleted_by int4 NULL,
	deleted_at timestamptz NULL
);