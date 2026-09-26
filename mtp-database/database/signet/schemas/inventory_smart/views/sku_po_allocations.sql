--liquibase formatted sql
--changeset liquibase:sku_dc_allocations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sku_dc_allocations
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_po_allocations;
CREATE OR REPLACE VIEW inventory_smart.sku_po_allocations
AS SELECT carfs.allocation_code,
    carfs.article,
    carfs.retail_size_cd AS size,
    ph.product ->> 'product_code'::text AS product_code,
    replace(carfs.dc_codes[1]::text, ''''::text, ''::text)::integer AS po_code,
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
           FROM inventory_smart.ph_master) ph ON ph.article::text = carfs.article::text AND pa.channel[1]::text = ph.channel::text AND carfs.retail_size_cd::text = (ph.product ->> 'size'::text)
  WHERE date((pm.updated_at AT TIME ZONE 'EST'::text)) = (now() AT TIME ZONE 'EST'::text)::date AND (pm.status = ANY (ARRAY[2, 3])) AND pm.is_deleted = false AND carfs.allocated_total <> 0::double precision AND carfs.retail_size_cd::text = (ph.product ->> 'size'::text) AND carfs.source::text = 'po'::text
  GROUP BY carfs.allocation_code, carfs.article, carfs.retail_size_cd, (ph.product ->> 'product_code'::text), (carfs.dc_codes[1]), pa.channel;
