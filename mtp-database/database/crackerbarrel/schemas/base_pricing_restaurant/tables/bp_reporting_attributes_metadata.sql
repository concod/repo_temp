--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_reporting_attributes_metadata_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_reporting_attributes_metadata_1


CREATE TABLE base_pricing_restaurant.bp_reporting_attributes_metadata (
	attribute_id serial4 NOT NULL,
	attribute_name varchar(50) NOT NULL,
	frontend_display_name varchar(100) NOT NULL,
	data_type varchar(50) NOT NULL,
	input_type varchar(50) NULL,
	input_values jsonb NULL,
	input_validation_ids _int4 DEFAULT '{}'::integer[] NOT NULL,
	default_visibility bool DEFAULT false NOT NULL,
	is_static bool DEFAULT false NOT NULL,
	is_dynamic bool DEFAULT false NOT NULL,
	is_editable_from_app bool DEFAULT true NOT NULL,
	is_editable_from_file bool DEFAULT true NOT NULL,
	is_filterable bool DEFAULT false NOT NULL,
	column_order int2 NULL,
	cell_render_params jsonb DEFAULT '[]'::jsonb NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	cell_render_type varchar(50) NULL,
	comparison_attributes _varchar DEFAULT '{}'::character varying(50)[] NULL,
	column_data_format varchar NULL,
	attribute_update_level varchar NULL,
	database_column varchar(50) NULL,
	report_display_name varchar(100) NULL,
	is_competitive_rule bool DEFAULT true NULL,
	is_resettable bool DEFAULT false NOT NULL,
	extra_params jsonb DEFAULT '[]'::jsonb NULL,
	depends_on varchar NULL,
	rule_types jsonb DEFAULT '[]'::jsonb NULL,
	product_store_impacted_attributes _varchar DEFAULT '{}'::character varying[] NOT NULL,
	CONSTRAINT bp_reporting_attributes_metadata_frontend_display_name_key UNIQUE (frontend_display_name),
	CONSTRAINT bp_reporting_attributes_metadata_name_key UNIQUE (attribute_name),
	CONSTRAINT bp_reporting_attributes_metadata_pkey PRIMARY KEY (attribute_id)
);

--changeset abhishek.singh@impactanalytics.co:bp_reporting_attributes_metadata_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_reporting_attributes_metadata_2

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
drop column created_at;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
drop column updated_at;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
add column created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
add column updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL;

--changeset abhishek.singh@impactanalytics.co:bp_reporting_attributes_metadata_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_reporting_attributes_metadata_3

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
drop column database_column;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
drop column report_display_name;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
drop column frontend_display_name;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
drop column attribute_name;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
add column database_column text NULL;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
add column report_display_name text NULL;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
add column frontend_display_name text NULL;

alter table base_pricing_restaurant.bp_reporting_attributes_metadata 
add column attribute_name text NULL;



--changeset abhishek.singh@impactanalytics.co:bp_reporting_attributes_metadata_5 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_reporting_attributes_metadata_4


ALTER TABLE base_pricing_restaurant.bp_reporting_attributes_metadata 
ADD COLUMN IF NOT EXISTS is_resettable bool DEFAULT false NOT NULL;


ALTER TABLE base_pricing_restaurant.bp_reporting_attributes_metadata 
ALTER COLUMN attribute_name TYPE varchar(100),
ALTER COLUMN frontend_display_name TYPE varchar(100),
ALTER COLUMN database_column TYPE varchar(50),
ALTER COLUMN report_display_name TYPE varchar(100);


ALTER TABLE base_pricing_restaurant.bp_reporting_attributes_metadata 
DROP CONSTRAINT IF EXISTS bp_reporting_attributes_metadata_frontend_display_name_key,
DROP CONSTRAINT IF EXISTS bp_reporting_attributes_metadata_name_key;

ALTER TABLE base_pricing_restaurant.bp_reporting_attributes_metadata 
ALTER COLUMN created_at SET NOT NULL,
ALTER COLUMN updated_at SET NOT NULL,
ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;


--changeset abhishek.singh@impactanalytics.co:bp_reporting_attributes_metadata_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_reporting_attributes_metadata_10
ALTER table base_pricing_restaurant.bp_reporting_attributes_metadata
ADD COLUMN is_value_preserved boolean DEFAULT true NOT NULL;