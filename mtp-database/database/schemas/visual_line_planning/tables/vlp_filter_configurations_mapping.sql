--liquibase formatted sql
--changeset liquibase:vlp_filter_configurations_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for vlp_filter_configurations_mapping
CREATE TABLE visual_line_planning.vlp_filter_configurations_mapping (
	"label" text NOT NULL,
	column_name text NOT NULL
);