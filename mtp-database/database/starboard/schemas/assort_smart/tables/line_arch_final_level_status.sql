--liquibase formatted sql
--changeset rishabh.swarnkar@impactanalytics.co:assort_smart.line_arch_final_level_status stripComments:false splitStatements:false context:MTP-75019 labels:create_table
--comment: initial changeset for line_arch_final_level_status
CREATE TABLE IF NOT EXISTS assort_smart.line_arch_final_level_status (
	id serial4 NOT NULL,
	plan_code int4 NULL,
	final_level varchar NULL,
	status varchar NULL,
	created_by int4 NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT line_arch_final_level_status_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS idx_line_arch_final_level_status ON assort_smart.line_arch_final_level_status USING btree (plan_code);