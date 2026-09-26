--liquibase formatted sql
--changeset ashish@impactanalytics.co:product_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for product_generic_schema_mapping

CREATE TABLE "global".product_generic_schema_mapping (
	source_column_name varchar NULL,
	source_column_datatype varchar NULL,
	required_in_product bool NOT NULL DEFAULT true,
	generic_column_name varchar NULL,
	is_pk bool NOT NULL DEFAULT false,
	generic_column_datatype varchar NOT NULL,
	formula varchar NULL,
	is_attribute bool NOT NULL DEFAULT false,
	is_hierarchy bool NOT NULL DEFAULT false,
	hierarchy_level int4 NULL,
	is_null_allowed bool NOT NULL DEFAULT false,
	unique_by bool NULL,
	display_name varchar NULL,
	is_partition_col bool NULL,
	is_clustering_col int NULL,
	PRIMARY KEY (generic_column_name)
);
