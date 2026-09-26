--liquibase formatted sql
--changeset liquibase:feature_metadata stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for feature_metadata
CREATE TABLE "global".feature_metadata (
	column_name varchar NULL,
	entity varchar NULL,
	data_type varchar NULL,
	"source" varchar NULL,
	is_feature bool NULL,
	feature_type varchar NULL,
	feature_encoding varchar NULL,
	unique_by bool NULL,
	aggregation_func varchar NULL,
	gbq_formula varchar NULL
);
