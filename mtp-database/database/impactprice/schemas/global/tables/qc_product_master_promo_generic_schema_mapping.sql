--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:qc_product_master_promo_generic_schema_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for qc_product_master_promo_generic_schema_mapping_v1

CREATE TABLE "global".qc_product_master_promo_generic_schema_mapping (
	source_column_name varchar NULL,
	source_column_datatype varchar NULL,
	required_in_product bool NOT NULL DEFAULT true,
	generic_column_name varchar NOT NULL,
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
	is_clustering_col int4 NULL,
	CONSTRAINT qc_product_master_promo_generic_schema_mapping_pkey PRIMARY KEY (generic_column_name)
);
