--liquibase formatted sql
--changeset liquibase:filter_configurations_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_configurations_mapping
CREATE TABLE "global".filter_configurations_mapping (
	fc_code int4 NOT NULL,
	"label" varchar NOT NULL,
	column_name varchar NOT NULL,
	"type" varchar NULL,
	display_type varchar NOT NULL,
	"level" int4 NULL,
	dimension varchar NOT NULL,
	is_mandatory bool NOT NULL DEFAULT false,
	is_multiple_selection bool NOT NULL DEFAULT true,
	range_min varchar NULL,
	range_max varchar NULL,
	default_value varchar NULL,
	is_disabled bool NOT NULL DEFAULT false,
	is_clearable bool NOT NULL DEFAULT false,
	display_order int4 NULL,
	is_required bool NULL DEFAULT false,
	extra jsonb NULL,
	CONSTRAINT fcm_type_check CHECK (((type)::text = ANY (ARRAY[('cascaded'::character varying)::text, ('non-cascaded'::character varying)::text]))),
	CONSTRAINT filter_configurations_mapping_un UNIQUE (fc_code, column_name, dimension),
	CONSTRAINT filter_configurations_mapping_fk FOREIGN KEY (fc_code) REFERENCES "global".filter_configurations(fc_code) ON DELETE CASCADE
);

--changeset arnab.nandy@impactanalytics.co:is_deleted column stripComments:false splitStatements:false context:is_deleted labels:MTP-28954
--comment: adding is_deleted column in the table
ALTER TABLE global.filter_configurations_mapping 
add column is_deleted bool NULL DEFAULT false;

--changeset chandra.ghosh@impactanalytics.co:fc_mapping_code_add_column stripComments:false splitStatements:false context: labels:MTP-55584
--comment: adding primary key column
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE "global".filter_configurations_mapping ADD COLUMN fc_mapping_code TEXT;

UPDATE "global".filter_configurations_mapping SET fc_mapping_code = uuid_generate_v4();

ALTER TABLE "global".filter_configurations_mapping
ADD CONSTRAINT filter_configurations_mapping_pkey PRIMARY KEY (fc_mapping_code);

--changeset chandra.ghosh@impactanalytics.co:fc_mapping_code_drop_column stripComments:false splitStatements:false context: labels:MTP-55584
--comment: droping primary key column

ALTER TABLE "global".filter_configurations_mapping
DROP COLUMN fc_mapping_code;

--changeset kamaleshwaran.k@impactanalytics.co:filter_configurations_mapping_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.filter_configurations_mapping 
ADD CONSTRAINT filter_configurations_mapping_pk 
PRIMARY KEY (fc_code, column_name, dimension);

ALTER TABLE global.filter_configurations_mapping 
DROP CONSTRAINT filter_configurations_mapping_un;