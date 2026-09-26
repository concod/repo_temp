
--liquibase formatted sql
--changeset liquibase:committed_capacity_values_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for committed_capacity_values_ua
CREATE TABLE source_smart.committed_capacity_values_ua (
	rule_id varchar(50) NULL,
	value_id varchar(50) NULL,
	units int4 NULL,
	smv int4 NULL,
	start_date varchar(50) NULL,
	end_date varchar(50) NULL,
    CONSTRAINT committed_capacity_values_ua_pk PRIMARY KEY (value_id)
);

--changeset naveenkumar.t@impactanalytics.co:dtype_change stripComments:false splitStatements:false context:Release_2_0 labels:alter_type
--comment: svm column datatype change
ALTER TABLE source_smart.committed_capacity_values_ua
ALTER COLUMN smv TYPE numeric
USING smv::numeric;

--changeset mayankmukundam@impactanalytics.co:add_columns stripComments:false splitStatements:false context:Release_3_0 labels:add_columns
--comment: add columns to committed_capacity_values_ua
ALTER TABLE source_smart.committed_capacity_values_ua
ADD COLUMN stated_capacity int4 DEFAULT 0 NULL;

--changeset mayank.mukundam@impactanalytics.co:committed_capacity_values_ua_add_columns stripComments:false splitStatements:false context:Release_4_0 labels:liquibase_project_start
--comment: add columns to committed_capacity_values_ua
ALTER TABLE source_smart.committed_capacity_values_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.committed_capacity_values_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.committed_capacity_values_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.committed_capacity_values_ua ADD COLUMN updated_at timestamptz;

--changeset genuine.basil@impactanalytics.co:committed_capacity_values_ua_idx_rule_id stripComments:false splitStatements:false context:Release_4_1 labels:liquibase_project_start
--comment: index on rule_id for joins and filters
CREATE INDEX IF NOT EXISTS committed_capacity_values_ua_rule_id_idx ON source_smart.committed_capacity_values_ua (rule_id);