--liquibase formatted sql
--changeset liquibase:intransit_generic_schema_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase
--comment: initial changeset for intransit_generic_schema_mapping

CREATE TABLE global."intransit_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);