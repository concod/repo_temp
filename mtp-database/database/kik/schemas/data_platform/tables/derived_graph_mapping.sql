--liquibase formatted sql
--changeset mohammed.abdulla@impactanalytics.co:derived_graph_mapping stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for derived graph mapping

CREATE TABLE IF NOT EXISTS data_platform.derived_graph_mapping (
	task_id varchar NULL,
	parent_id varchar NULL,
	tables_tobe_copied varchar NULL,
	is_deleted bool DEFAULT false NULL,
	created_by int4 NULL,
	created_at timestamptz NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	deleted_by int4 NULL,
	deleted_at timestamptz NULL
);


--changeset mohammed.abdulla@impactanalytics.co:add_db_type_column stripComments:false splitStatements:false context:Release_1_2 labels:added db_type
--comment: updating db_type column in derived_tables_mapping and derived_graph_mapping
ALTER TABLE data_platform.derived_graph_mapping 
ADD COLUMN db_type CHARACTER VARYING DEFAULT 'postregsql',
ADD COLUMN db CHARACTER VARYING DEFAULT 'common',
ALTER COLUMN db_type SET NOT null,
ALTER COLUMN db SET NOT null;


--changeset mohammed.abdulla@impactanalytics.co:derived_graph_mapping_1 stripComments:false splitStatements:false context:Release_3 labels:fix_for_default_value
--comment: fixed default value for db_type column
ALTER TABLE data_platform.derived_graph_mapping ALTER COLUMN db_type DROP DEFAULT;
ALTER TABLE data_platform.derived_graph_mapping ALTER COLUMN db_type SET DEFAULT 'postgresql';

