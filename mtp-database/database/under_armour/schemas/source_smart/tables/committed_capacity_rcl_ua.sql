--liquibase formatted sql
--changeset liquibase:committed_capacity_rcl_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for committed_capacity_rcl_ua

CREATE TABLE source_smart.committed_capacity_rcl_ua (
	rcl_id varchar(50) NULL,
	rcl_name varchar(50) NULL,
	priority int4 NULL,
	use_l0 bool NULL,
	use_l1 bool NULL,
	use_l2 bool NULL,
	use_l3 bool NULL,
	use_l4 bool NULL,
	use_l5 bool NULL,
	use_s0 bool NULL,
	use_s1 bool NULL,
	use_s2 bool NULL,
	updated_by varchar(50) NULL,
	last_modified varchar(50) NULL,
    CONSTRAINT committed_capacity_rcl_ua_pk PRIMARY KEY (rcl_id)
);