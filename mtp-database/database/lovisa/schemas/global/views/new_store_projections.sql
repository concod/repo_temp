--liquibase formatted sql
--changeset aleena.reji:new_store_projections runOnChange:true stripComments:false splitStatements:false context:zdt-views labels:MTP-1
--comment: initial changeset for new_store_projections
--rollback: SELECT 1
DROP VIEW if exists "global".new_store_projections;

CREATE OR REPLACE VIEW "global".new_store_projections
AS SELECT a.version_code,
    a.id,
    a.store_code,
    a.sister_store_code,
    a.l0_name,
    a.l1_name,
    a.l2_name,
    a.l3_name,
    a.range_name,
    a.projected_units,
    a.projected_value,
    a.extra_attributes,
    a.created_at,
    a.updated_at,
    a.launch_date,
    a.brand,
    a.store_code_name,
    a.style_color_description,
    a.store_name,
    a.s0_name,
    a.channel,
    a.channel_name,
    a.multiplier,
    a.wos,
    a.l4_name,
    a.l5_name,
    a.l6_name
   FROM global.new_store_projections_version a
  WHERE a.version_code = global.get_table_version('global.new_store_projections_version'::text);
  