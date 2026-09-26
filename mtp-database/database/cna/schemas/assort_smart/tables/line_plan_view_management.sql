--liquibase formatted sql
--changeset pulimallika.teja@impactanalytics.co.line_plan_view_management stripComments:false splitStatements:false context:MTP-75018 labels:create_table
--comment: initial changeset for line_plan_view_management

-- DROP TABLE assort_smart.line_plan_view_management;

CREATE TABLE assort_smart.line_plan_view_management (
	id serial4 NOT NULL,
	view_name varchar(255) NOT NULL,
	view_type varchar(20) NOT NULL,
	user_id varchar(255) NOT NULL,
	is_default_for_user bool DEFAULT false NULL,
	columns_config jsonb NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	is_active bool DEFAULT true NULL,
	CONSTRAINT line_plan_view_management_pkey PRIMARY KEY (id),
	CONSTRAINT line_plan_view_management_view_type_check CHECK (((view_type)::text = ANY ((ARRAY['global'::character varying, 'personal'::character varying])::text[])))
);





