--liquibase formatted sql
--changeset liquibase:filter_configurations_compulsory_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for filter_configurations_compulsory_mapping
CREATE TABLE "global".filter_configurations_compulsory_mapping (
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
	screen int4 NOT NULL,
	CONSTRAINT fcm_type_check CHECK (((type)::text = ANY (ARRAY[('cascaded'::character varying)::text, ('non-cascaded'::character varying)::text]))),
	CONSTRAINT filter_configurations_compulsory_mapping_un UNIQUE (column_name, screen)
);


--changeset kamaleshwaran.k@impactanalytics.co:filter_configurations_compulsory_mapping_1 stripComments:false splitStatements:false context:Release_2 labels:initial changeset for updating the primary key 
--comment: initial changeset for updating the primary key 

ALTER TABLE global.filter_configurations_compulsory_mapping 
ADD CONSTRAINT filter_configurations_compulsory_mapping_pk 
PRIMARY KEY (column_name, screen);

ALTER TABLE global.filter_configurations_compulsory_mapping 
DROP CONSTRAINT filter_configurations_compulsory_mapping_un;
