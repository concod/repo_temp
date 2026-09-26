--liquibase formatted sql
--changeset liquibase:table_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_configurations
CREATE TABLE "global".table_configurations (
	tc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	screens _varchar NOT NULL DEFAULT ARRAY[]::character varying[],
	page_size int4 NULL DEFAULT 20,
	"header" varchar NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now(),
	created_by int4 NULL,
	updated_by int4 NULL,
	special_classification varchar NULL,
	description text NULL,
	extra json NULL,
	CONSTRAINT tab_c_name_check CHECK ((length((name)::text) > 0)),
	CONSTRAINT utc_pk PRIMARY KEY (tc_code)
);
ALTER TABLE "global".table_configurations ADD CONSTRAINT table_configurations_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;
ALTER TABLE "global".table_configurations ADD CONSTRAINT table_configurations_updated_at_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL;

--changeset arnab.nandy@impactanalytics.co:table_configurations_dimensions_column stripComments:false splitStatements:false context:dimensions labels:MTP-29039
--comment: adding dimensions column in the table
alter table global.table_configurations
add column dimensions _varchar;

--changeset arnab.nandy@impactanalytics.co:table_configurations_screen_codes_column stripComments:false splitStatements:false context:dimensions labels:MTP-29039
--comment: adding screen_codes column in the table
alter table global.table_configurations 
add column screen_codes _int4 NOT null default '{-1}';