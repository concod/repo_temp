--liquibase formatted sql
--changeset ramkumar.vahanan:sku_dc_allocated_summary_v1 runOnChange:true stripComments:false splitStatements:false context:lse_opti labels:lse_opti
--comment: Rolled-up DC allocation qty from allocated_total (no pack_dc_allocation unnest). Pair with sku_dc_allocated_units for pack/eaches detail.
--rollback: SELECT 1
DROP VIEW IF EXISTS inventory_smart.sku_dc_allocated_summary;
CREATE OR REPLACE VIEW inventory_smart.sku_dc_allocated_summary AS
SELECT
  carfs.allocation_code,
  carfs.article,
  carfs.retail_size_cd AS size,
  saf.channel,
  sum(carfs.allocated_total) AS quantity,
  max(carfs.updated_at) AS updated_at
FROM
  inventory_smart.create_allocation_result_flat_gurobi carfs
  JOIN global.store_attributes_filter saf ON saf.store_code::text = carfs.store::text
  JOIN inventory_smart.plan_master pm ON carfs.allocation_code::text = pm.plan_code::text
WHERE
  pm.is_deleted = false
  AND carfs.source::text = 'dc'::text
  AND (
    (
      pm.status = 3
      AND carfs.created_at BETWEEN (
        date(now() AT TIME ZONE 'UTC')::timestamp AT TIME ZONE 'UTC'
      )
      AND (
        date(now() AT TIME ZONE 'UTC')::timestamp AT TIME ZONE 'UTC' + interval '23:59:59'
      )
    )
    OR (
      pm.status = 2
      AND carfs.created_at BETWEEN (
        date(now() AT TIME ZONE 'UTC')::timestamp AT TIME ZONE 'UTC' - interval '5 days'
      )
      AND (
        date(now() AT TIME ZONE 'UTC')::timestamp AT TIME ZONE 'UTC' + interval '23:59:59'
      )
    )
  )
GROUP BY
  carfs.allocation_code,
  carfs.article,
  carfs.retail_size_cd,
  saf.channel;
