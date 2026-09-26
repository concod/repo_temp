--liquibase formatted sql
--changeset ashish@impactanalytics.co:retail_launch_distro_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for retail_launch_distro_generic_schema_mapping

CREATE TABLE global."retail_launch_distro_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	