--liquibase formatted sql
--changeset ashish@impactanalytics.co:sap_bulk_po_generic_schema_mapping stripComments:false splitStatements:false context:Release_2 labels:pk_mandatory
--comment: initial changeset for sap_bulk_po_generic_schema_mapping

CREATE TABLE global."sap_bulk_po_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
	