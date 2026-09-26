--liquibase formatted sql
--changeset liquibase:allocation_rcl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rcl
CREATE TABLE source_smart.allocation_rcl (
	rcl_id serial4 NOT NULL,
	rcl_name varchar(255) NULL,
	priority int4 NULL,
	use_season bool DEFAULT false NOT NULL,
	use_l0 bool DEFAULT false NOT NULL,
	use_l1 bool DEFAULT false NOT NULL,
	use_l2 bool DEFAULT false NOT NULL,
	use_l3 bool DEFAULT false NOT NULL,
	use_l4 bool DEFAULT false NOT NULL,
	use_l5 bool DEFAULT false NOT NULL,
	use_s0 bool DEFAULT false NOT NULL,
	use_s1 bool DEFAULT false NOT NULL,
	use_s2 bool DEFAULT false NOT NULL,
	updated_by varchar(255) NULL,
	last_modified timestamp NULL,
	CONSTRAINT allocation_rcl_priority UNIQUE (priority),
	CONSTRAINT allocation_rcl_rcl_name_key UNIQUE (rcl_name),
	CONSTRAINT arcl_pk PRIMARY KEY (rcl_id)
);