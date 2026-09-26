--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:add_app_attr_id stripComments:false splitStatements:false context:MTP-36993 labels:liquibase_project_start
--comment: removed is_active column,added app_attribute_ids json column and updated index
CREATE TABLE "global".table_config_views (
	id serial4 NOT NULL,
	view_name varchar NOT NULL,
	created_by int4 NOT NULL,
	tc_code int4 NOT NULL,
	preference jsonb NULL,
	view_type varchar NULL,
	is_default bool NULL DEFAULT false,
	is_deleted bool NULL DEFAULT false,
	module_code int4 NULL,
	updated_by int4 NULL,
	app_attribute_ids json NULL,
	CONSTRAINT table_config_views_pk PRIMARY KEY (id),
	CONSTRAINT unique_view_name UNIQUE (view_name),
	CONSTRAINT table_config_views_module_fk FOREIGN KEY (module_code) REFERENCES "global".module_master(module_code)
);
CREATE INDEX idx_view_type_tc_code ON global.table_config_views USING btree (view_type, tc_code);

--changeset gautam.baruah@impactanalytics.co:add_new_constraint stripComments:false splitStatements:false context:MTP-38095 labels:liquibase_project_start
--comment: dropped unique_view_name constraint and added new constraint based on is_deleted
ALTER TABLE "global".table_config_views
DROP CONSTRAINT IF EXISTS unique_view_name;
ALTER TABLE "global".table_config_views
ADD CONSTRAINT unique_view_name_check
EXCLUDE USING gist (lower((view_name)::text) WITH =) WHERE ((NOT is_deleted));

--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:add_timestamp_columns stripComments:false splitStatements:false context:MTP-39037 labels:liquibase_project_start
--comment: added empty view name constraint check , created_at and updated_at columns
ALTER TABLE "global".table_config_views ADD CONSTRAINT view_name_check CHECK ((length((view_name)::text) > 0));

ALTER TABLE "global".table_config_views ADD COLUMN created_at timestamptz NULL DEFAULT NOW() , ADD COLUMN updated_at timestamptz NULL DEFAULT NOW();

--changeset arnab.nandy@impactanalytics.co:add_custom_tab_preferences_column stripComments:false splitStatements:false context:MTP-45422 labels:liquibase_project_start
--comment: adding custom_tab_preference_column
ALTER TABLE "global".table_config_views
ADD COLUMN custom_tab_preferences jsonb NULL;
