--liquibase formatted sql
--changeset liquibase:plan_draft stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_draft
CREATE TABLE inventory_smart.plan_draft (
	allocation_id varchar NOT NULL,
	allocation_seq serial4 NOT NULL,
	req_top_table jsonb NOT NULL,
	"data" jsonb NOT NULL,
	created_by int4 NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	CONSTRAINT plan_draft_un UNIQUE (allocation_id, allocation_seq)
);
