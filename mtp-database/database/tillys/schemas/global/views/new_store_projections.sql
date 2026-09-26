
--liquibase formatted sql
--changeset gauri.nair:new_store_projections runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for new_store_projections
--rollback: SELECT 1
DROP VIEW if exists "global".new_store_projections;

CREATE OR REPLACE VIEW "global".new_store_projections AS 
SELECT new_store_projections_version.version_code,
    new_store_projections_version.id,
    new_store_projections_version.store_code,
    new_store_projections_version.sister_store_code,
    new_store_projections_version.article,
    new_store_projections_version.l0_name,
    new_store_projections_version.l1_name,
    new_store_projections_version.l2_name,
    new_store_projections_version.l3_name,
    new_store_projections_version.projected_units,
    new_store_projections_version.projected_value,
    new_store_projections_version.extra_attributes,
    new_store_projections_version.created_at,
    new_store_projections_version.updated_at,
    new_store_projections_version.store_name,
    new_store_projections_version.s0_name,
    new_store_projections_version.channel,
    new_store_projections_version.multiplier,
    new_store_projections_version.wos,
    new_store_projections_version.fiscal_year_week,
    new_store_projections_version.l4_name
   FROM global.new_store_projections_version
  WHERE version_code = global.get_table_version('global.new_store_projections_version'::text);