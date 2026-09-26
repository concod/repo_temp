--liquibase formatted sql
--changeset ashish@impactanalytics.co:VB_aps_append_table_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for VB_aps_append_table_generic_schema_mapping

CREATE TABLE global."VB_aps_append_table_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	