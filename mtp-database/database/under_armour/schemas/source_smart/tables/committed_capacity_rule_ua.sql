
--liquibase formatted sql
--changeset liquibase:committed_capacity_rule_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for committed_capacity_rule_ua
CREATE TABLE source_smart.committed_capacity_rule_ua (
	rule_id varchar(50) NULL,
	rcl_id varchar(50) NULL,
	rule_name varchar(50) NULL,
	l0_code varchar(50) NULL,
	l1_code varchar(50) NULL,
	l2_code varchar(50) NULL,
	l3_code varchar(50) NULL,
	l4_code varchar(50) NULL,
	l5_code varchar(50) NULL,
	s0_code varchar(50) NULL,
	s1_code varchar(50) NULL,
	s2_code varchar(50) NULL,
	facility_id int4 NULL,
	vendor_id int4 NULL,
	updated_by varchar(50) NULL,
	last_modified varchar(50) NULL,
	placeholder_id int4 NULL,
	season_id varchar(50) NULL,
    CONSTRAINT committed_capacity_rule_ua_pk PRIMARY KEY (rule_id)
);

--changeset mayank.mukundam@impactanalytics.co:committed_capacity_rule_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to committed_capacity_rule_ua
ALTER TABLE source_smart.committed_capacity_rule_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.committed_capacity_rule_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.committed_capacity_rule_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.committed_capacity_rule_ua ADD COLUMN updated_at timestamptz;

--changeset genuine.basil@impactanalytics.co:committed_capacity_rule_ua_idx_l0_season_facility stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: partial index for l0_code, season_id, facility_id when facility_id is set
CREATE INDEX IF NOT EXISTS committed_capacity_rule_ua_l0_season_facility_idx ON source_smart.committed_capacity_rule_ua (l0_code, season_id, facility_id) WHERE facility_id IS NOT NULL;