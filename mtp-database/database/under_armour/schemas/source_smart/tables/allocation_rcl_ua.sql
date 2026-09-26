--liquibase formatted sql
--changeset liquibase:allocation_rcl_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rcl_ua
CREATE TABLE source_smart.allocation_rcl_ua (
	rcl_id serial4 NOT NULL,
	rcl_name varchar(100) NOT NULL,
	priority int4 NULL,
	use_season bool DEFAULT true NULL,
	use_l0_name bool DEFAULT true NULL,
	use_gender bool DEFAULT false NULL,
	use_productteams bool DEFAULT false NULL,
	use_subcategory bool DEFAULT false NULL,
	use_calender bool DEFAULT false NULL,
	use_expected_toolset bool DEFAULT false NULL,
	use_sourcing_class_name bool DEFAULT false NULL,
	is_active bool DEFAULT false NULL,
	last_modified_by varchar(100) NULL,
	last_modified_at timestamptz NULL,
	CONSTRAINT allocation_rcl_ua_pkey PRIMARY KEY (rcl_id),
	CONSTRAINT allocation_rcl_ua_rcl_name_key UNIQUE (rcl_name)
);