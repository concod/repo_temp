--liquibase formatted sql
--changeset liquibase:line_plan stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for line_plan
CREATE TABLE visual_line_planning.line_plan (
	line_plan_id uuid NOT NULL,
	line_plan_name text NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	created_by text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	season text NULL,
	status text DEFAULT 'Pending'::text NULL,
	is_deleted bool DEFAULT false NOT NULL,
	selling_start_date date NULL,
	selling_end_date date NULL,
	product_list jsonb NULL,
	CONSTRAINT line_plan_pkey PRIMARY KEY (line_plan_id)
);