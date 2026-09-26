--liquibase formatted sql
--changeset himansh.bhardwaj:sync_ecom_constraint_alert_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_ecom_constraint_alert_9_on_floor_date_markdown_date_fix
--rollback: SELECT 1


DROP PROCEDURE IF EXISTS public.sync_ecom_constraint_alert;
-- DROP PROCEDURE public.sync_ecom_constraint_alert();

CREATE OR REPLACE PROCEDURE public.sync_ecom_constraint_alert()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_ecom_constraint_alert';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    today_partition TEXT;
    sql TEXT;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Clear the target table
    DELETE FROM inventory_smart.ecom_constraint_alert WHERE true;

    -- Get today's date in yyyymmdd format
    SELECT TO_CHAR(CURRENT_DATE, 'YYYYMMDD') INTO today_partition;

    -- Compose the dynamic SQL for the insert
    sql := '
    INSERT INTO inventory_smart.ecom_constraint_alert (
        l7_code, article, color, l3_name, l4_name, l5_name, l6_name, available_dc_oh,
        store_oh, store_it, store_oo, dc_mapped, iob, fwos, vir_reservation_remaining_pdu_remaining,
        auto_allocation_dc, l0_name, l2_name, ecom_constraint_flag, ecom_constraint_is_resolved,
        display_article, product_group, l1_name, article_description, dc_assignment, on_floor_date, markdown_date
    )
    
WITH filtered_allocations AS (
  SELECT
    *
  FROM
    inventory_smart.create_allocation_result_flat_gurobi_' || today_partition || '
  WHERE
    allocation_code IN (
      SELECT
        plan_code
      FROM
        inventory_smart.plan_master pm
      WHERE
        (
          (
            created_at - INTERVAL ''12 hours 30 minutes''
          )::date
        ) = (
          current_timestamp AT TIME ZONE ''America/Los_Angeles''
        )::date
          AND plan_code LIKE ''9_%510053%''
    )
),
    allocation AS (
  SELECT *,
              CASE
        WHEN original_forecast-oh_oo_it<min THEN GREATEST(
          original_forecast-oh_oo_it,
          min-oh_oo_it,
          0
      )
      WHEN original_forecast-oh_oo_it>max THEN LEAST(
          original_forecast-oh_oo_it,
          max-oh_oo_it,
          0
      )
      ELSE GREATEST(
          original_forecast-oh_oo_it,
          0
      )
    END AS constrained_forecast
  FROM
    (
      SELECT
        DISTINCT article
         ,
        store
         ,
        retail_size_cd
         ,
        allocation_code
         ,
        jsonb_object_keys(pack_dc_allocation) AS dc_code
         ,
        jsonb_array_elements_text(
          pack_dc_allocation -> jsonb_object_keys(pack_dc_allocation) -> ''packs_allocated''
        )::TEXT AS pack_type_id
         ,
        jsonb_array_elements_text(
          pack_dc_allocation -> jsonb_object_keys(pack_dc_allocation) -> ''packs_allocated_qty''
        )::FLOAT8 AS allocated_qty
         ,
        jsonb_array_elements_text(
          pack_dc_allocation -> jsonb_object_keys(pack_dc_allocation) -> ''packs_available_qty''
        )::FLOAT8 AS dc_available
         ,
        min
         ,
        max
         ,
        demand AS original_forecast
         ,
        GREATEST(oh_oo_intransit-lt_forecast,0) AS oh_oo_it
      FROM
        inventory_smart.create_allocation_result_flat_gurobi carfg
      WHERE
        EXISTS (
          SELECT
            1
          FROM
            filtered_allocations fa
          WHERE
            fa.allocation_code = carfg.allocation_code
        )
    ) x
  JOIN (
      SELECT
        DISTINCT product_code AS pack_type_id,
        SIZE
      FROM
        GLOBAL.product_attributes_filter
    ) paf
      USING(pack_type_id)
  WHERE
    (
      paf.SIZE IS NULL
        OR paf.SIZE = x.retail_size_cd
    )
),
    agg AS (
  SELECT
            a.article,
            a.dc_code::integer AS dc_code,
            i.vir_constraint_flag,
            SUM(a.allocated_qty) AS allocated_quantity,
            sum(a.constrained_forecast) AS constrained_forecast,
            avg(i.vir_reservation_remaining) AS vir_reservation_remaining,
            avg(i.iob_reservation_remaining) AS iob_reservation_remaining
  FROM
      allocation a
  LEFT JOIN inventory_smart.article_inventory_constraint i
          ON
      a.article = i.article
    AND a.dc_code::integer = i.dc_code
  GROUP BY
      a.article,
      a.dc_code::integer,
      i.vir_constraint_flag
),
  main AS (
  SELECT
          ph.l7_code,
          aa.article,
          paf.color,
          ph.l3_name,
          ph.l4_name,
          ph.l5_name,
          ph.l6_name,
          aid.dc_oh AS available_dc_oh,
          SUM(aid.oh) AS store_oh,
          SUM(aid.it) AS store_it,
          SUM(aid.oo) AS store_oo,
          paf.dc_assignment AS dc_mapped,
          aid.iob AS iob,
          aid.vir_pdu_remaining AS vir_reservation_remaining_pdu_remaining,
          dc.name AS auto_allocation_dc,
          ph.l0_name,
          ph.l2_name,
          1 AS ecom_constraint_flag,
          0 AS ecom_constraint_is_resolved,
          ph.display_article,
          NULL AS product_group,
          ph.l1_name,
          ph.article_description,
          avg(aid.wos_oh_it_oo) AS fwos,
          aa.constrained_forecast,
          aa.iob_reservation_remaining::int + aa.vir_reservation_remaining::int AS vir_iob,
          i2.iob_reservation_remaining,
          dc.linked_store_code,
          aid.on_floor_date, 
          aid.markdown_date
  FROM
      agg aa
  JOIN inventory_smart.article_inventory_constraint i2
          ON
      aa.article = i2.article
    AND aa.dc_code <> i2.dc_code
  LEFT JOIN inventory_smart.ph_master ph
          ON
      aa.article = ph.article
  LEFT JOIN (
      SELECT
          article,
          dc_oh,
          vir_pdu_remaining,
          iob,
          sum(oh) AS oh,
          sum(it) it,
          sum(oo) AS oo,
          avg(wos_oh_it_oo) wos_oh_it_oo,
          min(floorset_date) as on_floor_date,
          min(markdown_date) as markdown_date
      FROM
          inventory_smart.article_inventory_dashboard
      group by 1,
               2,
               3,
               4
    ) aid 
          ON
      aa.article = aid.article
  LEFT JOIN (
      SELECT
          DISTINCT article,
          color,
          dc_assignment
      FROM
          global.product_attributes_filter
    ) paf 
          ON
      aa.article = paf.article
  LEFT JOIN global.distribution_centres dc
          ON
      aa.dc_code = dc.dc_code
  WHERE
      aa.iob_reservation_remaining::int + aa.vir_reservation_remaining::int< aa.constrained_forecast
    AND i2.iob_reservation_remaining > 0
  GROUP BY
            ph.l7_code,
      aa.article,
      paf.color,
      ph.l3_name,
      ph.l4_name,
      ph.l5_name,
      ph.l6_name,
            aid.dc_oh,
      paf.dc_assignment,
      aid.iob,
      aid.vir_pdu_remaining,
            dc.name,
      ph.l0_name,
      ph.l2_name,
      ph.display_article,
      ph.l1_name,
      ph.article_description,
      aa.constrained_forecast,
      aa.iob_reservation_remaining::int + aa.vir_reservation_remaining::int,
      i2.iob_reservation_remaining,
      dc.linked_store_code,
      aid.on_floor_date,
      aid.markdown_date
)
    SELECT
        l7_code,
        article,
        color,
        l3_name,
        l4_name,
        l5_name,
        l6_name,
        available_dc_oh,
        store_oh,
        store_it,
        store_oo,
        dc_mapped,
        iob,
        round(
    fwos::NUMERIC,
    2
  ) fwos,
        vir_reservation_remaining_pdu_remaining,
        auto_allocation_dc,
        l0_name,
        l2_name,
        ecom_constraint_flag,
        ecom_constraint_is_resolved,
        display_article,
        NULL AS product_group,
        l1_name,
        article_description,
        dc_mapped as dc_assignment,
        on_floor_date, 
        markdown_date
FROM
  main;
    ';

    -- Execute the dynamic SQL
    EXECUTE sql;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;