--liquibase formatted sql
--changeset liquibase:tb_store_master runAlways:true stripComments:false splitStatements:false context:tb_store_master labels:tb_store_master
--comment: tb_store_master
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".tb_store_master;
CREATE OR REPLACE VIEW "global".tb_store_master
AS SELECT t1.country,
    t1.city,
    t1.store_id,
    t1.store_name,
    t1.address,
    t1.address_2,
    t1.open_date,
    t1.closed,
    t1.compqualify_date,
    t1.county,
    t1.dma,
    t1.state,
    t1.store_name_heading,
    t1.loyalty_scheme,
    t1.store_model_id,
    t1.store_model_cid,
    t1.store_model,
    t1.store_type_id,
    t1.store_type_cid,
    t1.store_type,
    t1.s0_id,
    t1.s0_cid,
    t1.s0_name,
    t1.active,
    t1.store_reco_level,
    t1.version_code,
    t1.is_active,
    t1.hierarchy_id
   FROM global.tb_store_master_version t1
  WHERE t1.version_code = global.get_table_version('global.tb_store_master_version'::text);