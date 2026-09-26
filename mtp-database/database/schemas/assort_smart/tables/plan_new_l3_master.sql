--liquibase formatted sql
--changeset liquibase:plan_new_l3_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_new_l3_master
CREATE TABLE assort_smart.plan_new_l3_master (
	plan_code int4 NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	levels jsonb NULL,
	"attributes" jsonb NULL,
	style_code _varchar NULL
);