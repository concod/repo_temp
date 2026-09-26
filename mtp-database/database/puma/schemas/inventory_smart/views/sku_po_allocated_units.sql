--liquibase formatted sql
--changeset liquibase:sku_po_allocated_units runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_po_allocated_units
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_allocated_units;
CREATE OR REPLACE VIEW inventory_smart.sku_po_allocated_units
AS SELECT ph.ph_code,
    carfs.article,
    carfs.retail_size_cd AS size,
    ph.product ->> 'product_code'::text AS product_code,
    replace(carfs.dc_codes[1]::text, ''''::text, ''::text) AS dc_code,
    pa.channel[1] AS channel,
    sum(carfs.allocated_total) AS quantity,
    max(carfs.updated_at) AS updated_at
   FROM inventory_smart.create_allocation_result_flat_gurobi carfs
     JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
     JOIN ( SELECT plan_attributes.plan_code,
            plan_attributes.attribute_value::character varying[] AS channel
           FROM inventory_smart.plan_attributes
          WHERE plan_attributes.attribute_name::text = 'channel'::text) pa ON pm.plan_code::text = pa.plan_code
     JOIN ( SELECT ph_master.ph_code,
            ph_master.article,
            ph_master.channel,
            unnest(ph_master.product_code_size_map) AS product
           FROM inventory_smart.ph_master) ph ON ph.article::text = carfs.article::text AND carfs.retail_size_cd::text = (ph.product ->> 'size'::text) AND pa.channel[1]::text = ph.channel::text
  WHERE date((carfs.created_at AT TIME ZONE 'EST'::text)) = now()::date AND carfs.source::text = 'po'::text AND (pm.status = ANY (ARRAY[2, 3])) AND pm.type = 4 AND pm.is_deleted = false
  GROUP BY ph.ph_code, carfs.article, carfs.retail_size_cd, (ph.product ->> 'product_code'::text), (replace(carfs.dc_codes[1]::text, ''''::text, ''::text)), (pa.channel[1]);
