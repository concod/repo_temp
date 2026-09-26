--liquibase formatted sql
--changeset liquibase:rcl_network_versions_latest runOnChange:true stripComments:false splitStatements:false context:MTP-20089-3 labels:liquibase_project_start
--comment:rcl_network_versions_latest
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.rcl_network_versions_latest;