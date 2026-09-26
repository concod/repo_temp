-- liquibase formatted sql
--changeset liquibase:sku_asn_available_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_asn_available_units

DROP VIEW IF EXISTS inventory_smart.sku_asn_available_units;