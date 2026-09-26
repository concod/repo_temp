-- liquibase formatted sql
--changeset liquibase:sku_asn_available_units_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Updated changeset for sku_asn_available_units

DROP VIEW IF EXISTS inventory_smart.sku_asn_available_units;