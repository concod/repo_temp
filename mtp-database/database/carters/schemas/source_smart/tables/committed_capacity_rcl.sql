--liquibase formatted sql
--changeset liquibase:committed_capacity_rcl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for committed_capacity_rcl
CREATE TABLE source_smart.committed_capacity_rcl (
	rcl_id varchar(255) NOT NULL,
	rcl_name varchar(255) NULL,
	priority int4 NULL,
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
	CONSTRAINT ccrcl_pk PRIMARY KEY (rcl_id)
);