--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.line_arch_plan_status stripComments:false splitStatements:false context:MTP-75018 labels:create_table
--comment: initial changeset for line_arch_plan_status

-- DROP TABLE assort_smart.line_arch_plan_status;

CREATE TABLE IF NOT EXISTS assort_smart.line_arch_plan_status (
	id bigserial NOT NULL,
	plan_code int4 NULL,
	status varchar DEFAULT 'Not Started'::character varying NULL,
	created_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT line_arch_plan_status_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_line_plan_status ON assort_smart.line_arch_plan_status USING btree (plan_code);
