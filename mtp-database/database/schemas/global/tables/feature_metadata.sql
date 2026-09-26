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

--changeset kamalesh.k:feature_metadata stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to feature_metadata table

ALTER TABLE global.feature_metadata
Add column feature_metadata_code serial4,
ADD CONSTRAINT feature_metadata_pkey PRIMARY KEY (feature_metadata_code);
