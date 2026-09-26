--liquibase formatted sql
--changeset liquibase:table_configurations_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_configurations_mapping
CREATE TABLE "global".table_configurations_mapping (
	tc_code int4 NOT NULL,
	"label" varchar NOT NULL,
	column_name varchar NOT NULL,
	dimension varchar NOT NULL,
	"type" varchar NULL,
	is_frozen bool NOT NULL DEFAULT false,
	is_editable bool NOT NULL DEFAULT false,
	is_aggregated bool NOT NULL DEFAULT false,
	order_of_display float8 NULL,
	is_hidden bool NULL,
	is_required bool NOT NULL DEFAULT false,
	tc_mapping_code serial4 NOT NULL,
	child_tc_mapping_code int4 NULL,
	aggregate_type varchar NULL,
	formatter varchar NULL,
	is_row_span bool NOT NULL DEFAULT false,
	footer varchar NULL,
	is_searchable bool NOT NULL DEFAULT true,
	extra json NULL DEFAULT '{}'::json,
	is_sortable bool NULL DEFAULT true,
	width int4 NOT NULL DEFAULT 200,
	CONSTRAINT table_configurations_mapping_pk PRIMARY KEY (tc_mapping_code),
	CONSTRAINT table_configurations_mapping_fk FOREIGN KEY (tc_code) REFERENCES "global".table_configurations(tc_code) ON DELETE CASCADE,
	CONSTRAINT table_configurations_mapping_fk2 FOREIGN KEY (child_tc_mapping_code) REFERENCES "global".table_configurations_mapping(tc_mapping_code) ON DELETE CASCADE
);
COMMENT ON COLUMN global.table_configurations_mapping.aggregate_type
    IS 'aggregate type if is_aggregated is true';
COMMENT ON COLUMN global.table_configurations_mapping.formatter
    IS 'value formatter  ex. roundOff, roundOfftoTwoDecimals';

--changeset arnab.nandy@impactanalytics.co:is_deleted column stripComments:false splitStatements:false context:is_deleted labels:MTP-30879
--comment: adding is_deleted column in the table
alter table global.table_configurations_mapping
add column is_deleted bool NULL DEFAULT false;

--changeset arnab.nandy@impactanalytics.co:is_master_group column stripComments:false splitStatements:false context:is_master_group labels:MTP-30879
--comment: adding is_master_group column in the table
alter table global.table_configurations_mapping
add column is_master_group bool NULL DEFAULT false;

--changeset arnab.nandy@impactanalytics.co:tc_mapping_code_text column stripComments:false splitStatements:false context:tc_mapping_code_text labels:MTP-30879
--comment: converting tc_mapping_code type to text from int
ALTER TABLE global.table_configurations_mapping
DROP CONSTRAINT table_configurations_mapping_fk2;

ALTER TABLE global.table_configurations_mapping
ALTER COLUMN child_tc_mapping_code TYPE text;

ALTER TABLE global.table_configurations_mapping
ALTER COLUMN tc_mapping_code SET DATA TYPE TEXT;

ALTER TABLE global.table_configurations_mapping
ALTER COLUMN tc_mapping_code SET DEFAULT uuid_generate_v4();

ALTER TABLE global.table_configurations_mapping
ADD CONSTRAINT table_configurations_mapping_fk2 FOREIGN KEY (child_tc_mapping_code) REFERENCES "global".table_configurations_mapping(tc_mapping_code) ON DELETE CASCADE;

ALTER TABLE global.table_configurations_mapping
ADD CONSTRAINT table_configurations_mapping_uk UNIQUE (tc_code, label, column_name, dimension);
