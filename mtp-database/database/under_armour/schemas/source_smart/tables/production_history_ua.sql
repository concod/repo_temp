--liquibase formatted sql
--changeset liquibase:production_history_ua stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for production_history_ua

CREATE TABLE source_smart.production_history_ua (
	history_id int4 NULL,
	vendor_id int4 NULL,
	facility_id int4 NULL,
	dc_code int4 NULL,
	sourcing_id varchar(50) NULL,
	season_id varchar(50) NULL,
	allocated_quantity int4 NULL,
	style_color_id varchar(50) NULL
);

--changeset mayank.mukundam@impactanalytics.co:production_history_ua_add_columns stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: add columns to production_history_ua
ALTER TABLE source_smart.production_history_ua ADD COLUMN is_updated bool;
ALTER TABLE source_smart.production_history_ua ADD COLUMN is_active bool;
ALTER TABLE source_smart.production_history_ua ADD COLUMN created_at timestamptz;
ALTER TABLE source_smart.production_history_ua ADD COLUMN updated_at timestamptz;

--changeset mayank.mukundam@impactanalytics.co:production_history_ua_change_dc_code_type stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: change dc_code column type from int4 to varchar
ALTER TABLE source_smart.production_history_ua ALTER COLUMN dc_code TYPE varchar;
ALTER TABLE source_smart.production_history_ua ADD COLUMN product_code varchar;

--changeset mayank.mukundam@impactanalytics.co:production_history_ua_alter_columns stripComments:false splitStatements:false context:Release_1_3 labels:liquibase_project_start
--comment: alter columns in production_history_ua
ALTER TABLE source_smart.production_history_ua ALTER COLUMN sourcing_id TYPE varchar;
ALTER TABLE source_smart.production_history_ua ALTER COLUMN season_id TYPE varchar;
ALTER TABLE source_smart.production_history_ua ALTER COLUMN style_color_id TYPE varchar;
