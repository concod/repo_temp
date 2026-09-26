--liquibase formatted sql
--changeset ashish@impactanalytics.co:channelgroup_channeltype_mapping_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for channelgroup_channeltype_mapping_generic_schema_mapping

CREATE TABLE global."channelgroup_channeltype_mapping_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	