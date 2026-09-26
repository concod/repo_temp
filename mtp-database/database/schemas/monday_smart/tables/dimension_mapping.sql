--liquibase formatted sql
--changeset liquibase:dimension_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_mapping
CREATE TABLE monday_smart.dimension_mapping (
	"name" text NULL,
	table_id text NULL,
	col text NULL
);
--changeset bhargav.polavarapu@impactanalytics.co:dimension_mapping_new_columns_coltype_kccode_addition stripComments:false splitStatements:false context:Release_2 labels:new_columns_coltype_kccode_addition
--comment: adding new columns col_datatype and kc_code
ALTER TABLE monday_smart.dimension_mapping
ADD COLUMN  col_datatype varchar NOT NULL,
ADD COLUMN kc_code int4 NOT NULL;
--changeset bhargav.polavarapu@impactanalytics.co:dimension_mapping_new_constraint_addition_dimension_mapping_un stripComments:false splitStatements:false context:Release_2 labels:new_constraint_addition_dimension_mapping_un
--comment: adding new constraint dimension_mapping_un
ALTER TABLE monday_smart.dimension_mapping
ADD CONSTRAINT dimension_mapping_un UNIQUE (table_id, col);
--changeset bhargav.polavarapu@impactanalytics.co:dimension_mapping_new_constraint_addition_dimension_mapping_fk stripComments:false splitStatements:false context:Release_2 labels:new_constraint_addition_dimension_mapping_fk
--comment: adding new constraint dimension_mapping_fk
ALTER TABLE monday_smart.dimension_mapping
ADD CONSTRAINT dimension_mapping_fk
FOREIGN KEY (kc_code) REFERENCES monday_smart.kpi_categories_master(kc_code) ON DELETE RESTRICT;
--changeset bhargav.polavarapu@impactanalytics.co:Drop_column_name stripComments:false splitStatements:false context:Release_2 labels:column_drop_name
--comment: dropping the existing column name
ALTER TABLE monday_smart.dimension_mapping DROP COLUMN IF EXISTS  name;