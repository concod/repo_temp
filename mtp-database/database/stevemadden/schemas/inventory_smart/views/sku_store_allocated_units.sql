--liquibase formatted sql
--changeset ashish:sku_store_allocated_units runOnChange:true stripComments:false splitStatements:false context:rl_capacity labels:MTP-18226
--comment: RL sync from VB - Capacity breach
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_store_allocated_units;
