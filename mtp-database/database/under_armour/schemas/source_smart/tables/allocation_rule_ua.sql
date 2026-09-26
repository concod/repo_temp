--liquibase formatted sql
--changeset liquibase:allocation_rule_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_rule_ua
CREATE TABLE source_smart.allocation_rule_ua (
	rule_id serial4 NOT NULL,
	rule_name varchar(50) NULL,
	rcl_id int4 NOT NULL,
	season_name varchar(50) NULL,
	category varchar(50) NULL,
	sub_region varchar(50) NULL,
	sourcing_class_name varchar(50) NULL,
	forecast_version varchar(50) NULL,
	sourcing_mode varchar(50) NULL,
	threshold int4 NULL,
	strategy_name varchar(100) NULL,
	is_deletable bool DEFAULT true NULL,
	created_at timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	last_updated_at timestamptz NULL,
	is_saved bool NULL,
	rule_code text GENERATED ALWAYS AS ('R'::text || lpad(rule_id::text, 3, '0'::text)) STORED NULL,
	is_active bool DEFAULT true NULL,
	subcategory varchar(50) NULL,
	calender varchar(50) NULL,
	expected_toolset varchar(50) NULL,
	client_rule_key text NULL,
	created_by varchar(100) NULL,
	strategy_id uuid NULL,
	season_id varchar NULL,
	sourcing_class_id varchar NULL,
	product_team varchar NULL,
	CONSTRAINT allocation_rule_ua_client_rule_key_key UNIQUE (client_rule_key),
	CONSTRAINT allocation_rule_ua_pkey PRIMARY KEY (rule_id),
	CONSTRAINT allocation_rule_ua_rule_name_unique UNIQUE (rule_name)
);

--changeset liquibase:allocation-rule_ua_timestamp stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: adding default value to last_updated_At column
ALTER TABLE source_smart.allocation_rule_ua
ALTER COLUMN last_updated_at
SET DEFAULT CURRENT_TIMESTAMP;


--changeset mayank.mukundam@impactanalytics.co:allocation-rule_ua_rule_code_drop stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: Dropping the generated column before alter column for rule_code and altering generate function
ALTER TABLE source_smart.allocation_rule_ua
DROP COLUMN IF EXISTS rule_code;

ALTER TABLE source_smart.allocation_rule_ua
ADD COLUMN rule_code text
GENERATED ALWAYS AS (
    'R' || lpad(rule_id::text, 3, '0')
) STORED;

--changeset mayank.mukundam@impactanalytics.co_2:allocation-rule_ua_rule_code_drop stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: Dropping the generated column before alter column for rule_code and altering generate function to include case
ALTER TABLE source_smart.allocation_rule_ua
DROP COLUMN IF EXISTS rule_code;

ALTER TABLE source_smart.allocation_rule_ua
ADD COLUMN rule_code text
GENERATED ALWAYS AS ('R'::text ||
CASE
    WHEN length(rule_id::text) < 3 THEN lpad(rule_id::text, 3, '0'::text)
    ELSE rule_id::text
	END) STORED NULL;

--changeset zainab.firdous@impactanalytics.co:allocation-rule_ua_rule_expired_at stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: Adding expired_at column to allocation_rule_ua table
ALTER TABLE source_smart.allocation_rule_ua 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

--changeset genuine.basil@impactanalytics.co:allocation-rule_ua_rule_expired_at_index stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: Adding index to allocation_rule_ua table
CREATE INDEX idx_allocation_rule_ua_season_category_forecast ON source_smart.allocation_rule_ua USING btree (season_name, category, forecast_version, is_saved, is_active);
