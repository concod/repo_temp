--liquibase formatted sql
--changeset liquibase:upload_filter_configurations_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for upload_filter_configurations_mapping
CREATE TABLE IF NOT EXISTS "global".upload_filter_configurations_mapping (
	fc_code int4 NOT NULL,
	"label" varchar NOT NULL,
	column_name varchar NOT NULL,
	"type" varchar NULL,
	display_type varchar NOT NULL,
	"level" int4 NULL,
	dimension varchar NOT NULL,
	is_mandatory bool DEFAULT false NOT NULL,
	is_multiple_selection bool DEFAULT true NOT NULL,
	range_min varchar NULL,
	range_max varchar NULL,
	default_value varchar NULL,
	is_disabled bool DEFAULT false NOT NULL,
	is_clearable bool DEFAULT false NOT NULL,
	display_order int4 NULL,
	is_required bool DEFAULT false NULL,
	extra jsonb NULL,
	is_deleted bool DEFAULT false NOT NULL,
	CONSTRAINT fcm_type_check CHECK (((type)::text = ANY (ARRAY[('cascaded'::character varying)::text, ('non-cascaded'::character varying)::text]))),
	CONSTRAINT upload_filter_configurations_mapping_un UNIQUE (fc_code, column_name, dimension)
);

ALTER TABLE "global".upload_filter_configurations_mapping ADD CONSTRAINT upload_filter_configurations_mapping_fk FOREIGN KEY (fc_code) REFERENCES "global".filter_configurations(fc_code) ON DELETE CASCADE;

--changeset kamalesh.k@impactanalytics.co:upload_filter_configurations_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for upload_filter_configurations_mapping

ALTER TABLE "global".upload_filter_configurations_mapping
DROP CONSTRAINT IF EXISTS upload_filter_configurations_mapping_un;

ALTER TABLE "global".upload_filter_configurations_mapping
ADD CONSTRAINT upload_filter_configurations_mapping_pkey PRIMARY KEY (fc_code, column_name, dimension);