--liquibase formatted sql
--changeset liquibase:facility_cost_summary_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for facility_cost_summary_ua
CREATE TABLE source_smart.facility_cost_summary_ua (
	article varchar(50) NULL,
	store_code int4 NULL,
	facility_id int4 NULL,
	facility_country varchar(50) NULL,
	season_id varchar(50) NULL,
	fob int4 NULL,
	tariff_rate int4 NULL,
	freight int4 NULL,
	total_landed_cost int4 NULL,
	construction_type_id varchar(50) NULL,
	sourcing_class varchar(50) NULL,
	cost_id varchar(50) NULL,
	t2_sourcing_option_id varchar(50) NULL,
	t2_material_cost int4 NULL,
	product_code varchar NULL
);

--changeset mayank.mukundam@impactanalytics.co:facility_cost_summary_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to facility_cost_summary_ua
ALTER TABLE source_smart.facility_cost_summary_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.facility_cost_summary_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.facility_cost_summary_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.facility_cost_summary_ua ADD COLUMN updated_at timestamptz;

--changeset mayank.mukundam@impactanalytics.co:facility_cost_summary_ua_change_fob_type stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: change fob column type from int4 to float
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN fob TYPE float;

--changeset mayank.mukundam@impactanalytics.co:facility_cost_summary_ua_change_tariff_rate_type stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: change tariff_rate, freight, total_landed_cost, and t2_material_cost column types from int4 to float
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN tariff_rate TYPE float;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN freight TYPE float;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN total_landed_cost TYPE float;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN t2_material_cost TYPE float;

--changeset mayank.mukundam@impactanalytics.co:facility_cost_summary_ua_add_store_code stripComments:false splitStatements:false context:Release_1_4 labels:liquibase_project_start
--comment: add store_code column to facility_cost_summary_ua
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN store_code TYPE varchar;

--changeset mayank.mukundam@impactanalytics.co:facility_cost_summary_ua_alter_columns stripComments:false splitStatements:false context:Release_1_5 labels:liquibase_project_start
--comment: alter columns in facility_cost_summary_ua
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN article TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN facility_country TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN season_id TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN construction_type_id TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN sourcing_class TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN cost_id TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN t2_sourcing_option_id TYPE varchar;
ALTER TABLE source_smart.facility_cost_summary_ua ALTER COLUMN product_code TYPE varchar;

--changeset genuine.basil@impactanalytics.co:facility_cost_summary_ua_add_primary_key stripComments:false splitStatements:false context:Release_1_6 labels:liquibase_project_start
--comment: add primary key constraint on cost_id for facility_cost_summary_ua
ALTER TABLE source_smart.facility_cost_summary_ua ADD CONSTRAINT facility_cost_summary_ua_pkey PRIMARY KEY (cost_id, sourcing_class);
