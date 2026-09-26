--liquibase formatted sql
--changeset ashish@impactanalytics.co:supersession_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for supersession_generic_schema_mapping

CREATE TABLE global."supersession_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);

--changeset samarth.shinde@impactanalytics.co:drop_exclude_ecom_sub_sku_flag_col stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: drop the exclude_ecom_sub_sku_flag col from the gsm of supersession
ALTER TABLE "global".supersession_generic_schema_mapping drop column if exists exclude_ecom_sub_sku_flag;
