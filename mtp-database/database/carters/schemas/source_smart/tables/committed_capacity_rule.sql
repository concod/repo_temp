--liquibase formatted sql
--changeset liquibase:committed_capacity_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for committed_capacity_rule
CREATE TABLE source_smart.committed_capacity_rule (
	rule_id varchar(255) NOT NULL,
	rcl_id varchar(255) NULL,
	rule_name varchar(255) NULL,
	l0_code varchar(255) NULL,
	l1_code varchar(255) NULL,
	l2_code varchar(255) NULL,
	l3_code varchar(255) NULL,
	l4_code varchar(255) NULL,
	l5_code varchar(255) NULL,
	s0_code varchar(255) NULL,
	s1_code varchar(255) NULL,
	s2_code varchar(255) NULL,
	facility_id varchar(255) NULL,
	vendor_id varchar(255) NULL,
	updated_by varchar(255) NULL,
	last_modified timestamp NULL,
	CONSTRAINT ccrule_pk PRIMARY KEY (rule_id),
	CONSTRAINT fk_ccrcl FOREIGN KEY (rcl_id) REFERENCES source_smart.committed_capacity_rcl(rcl_id) ON DELETE CASCADE
);

--changeset liquibase:committed_capacity_rule_add_placeholder_id stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: new column addition for placeholder_id

ALTER TABLE source_smart.committed_capacity_rule ADD placeholder_id serial4 UNIQUE;