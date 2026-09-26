--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_bxgy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_psdf_create_final_table_from_bxgy

DROP PROCEDURE if exists price_promo_opt.pc_psdf_create_final_table_from_bxgy;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_bxgy(IN temp_table_name character varying, IN temp_disc_changes character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    query3_bxgy text;
    psd_bxgy_id int4;
    bxgy_disc_value float;
BEGIN
    start_time := clock_timestamp();

    ------------------------------------------------------------------
    -- 1. BXGY OFFER ID
    ------------------------------------------------------------------
    SELECT DISTINCT NULLIF(json_element.value->>'bxgy_offer_id', 'null')::int
    INTO psd_bxgy_id
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;

    RAISE NOTICE '[DEBUG] psd_bxgy_id = %', psd_bxgy_id;

    ------------------------------------------------------------------
    -- 2. BXGY DISCOUNT MULTIPLIER
    ------------------------------------------------------------------
    SELECT CASE
             WHEN bxgy_offer_type_id = 1 THEN 1
             WHEN bxgy_offer_type_id = 2 THEN tbo.discount_value * 0.01
             ELSE 1
           END
    INTO bxgy_disc_value
    FROM price_promo.tb_bxgy_offer tbo
    WHERE tbo.promo_id = var_promo_id
      AND tbo.bxgy_offer_id = psd_bxgy_id
    LIMIT 1;

    RAISE NOTICE '[DEBUG] bxgy_disc_value = %', bxgy_disc_value;

    ------------------------------------------------------------------
    -- 3. DEBUG: input table rowcount
    ------------------------------------------------------------------
--    EXECUTE format('SELECT COUNT(*) FROM %I', temp_disc_changes)
--    INTO STRICT end_time;  -- reuse end_time as a numeric holder
--    RAISE NOTICE '[DEBUG] input temp_disc_changes rowcount = %', end_time;

    ------------------------------------------------------------------
    -- Build final query with CTEs (UNCHANGED)
    ------------------------------------------------------------------
    query3_bxgy := format($sql$
DROP TABLE IF EXISTS %1$s;
CREATE UNLOGGED TABLE %1$s AS

WITH

base_kit AS (
  SELECT DISTINCT
    a.l3_cid AS slot1_l3,
    b.l3_cid AS slot2_l3,
    a.s1_id, a.c0_id,
    1 AS phase -- TODO
  FROM (
    SELECT DISTINCT product_id,  l3_cid, s1_id, c0_id, unit_name
    FROM %2$s pf
    WHERE pf.unit_name = 'X'
  ) a
  CROSS JOIN (
    SELECT DISTINCT product_id, l3_cid, unit_name
    FROM %2$s pf
    WHERE pf.unit_name = 'Y'
  ) b
),

redemption_data AS 
(
	SELECT b.*, 
	case when (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3) then sum_product else 0.5 end as sum_product1,
	case when (r.slot1 = b.slot2_l3 and r.slot2 = b.slot1_l3) then sum_product else 0.5 end as sum_product2,
	case when (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3) then intersecting_txn else 0.5 end as intersecting_txn
	
	FROM price_promo.tb_kit_offer_redemption_class r
	inner join base_kit b on (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3) or (r.slot1 = b.slot2_l3 and r.slot2 = b.slot1_l3)
),

long_format_phase AS (
select distinct unit_name, l3_cid, s1_id, c0_id, phase, phase_multiplier_kit
from(
  SELECT 'X' AS unit_name,
          slot1_l3 AS l3_cid,
         s1_id, c0_id, phase,
         SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) AS phase_multiplier_kit
  FROM redemption_data r
  GROUP BY 1,2,3,4,5

  UNION ALL

  SELECT 'Y' AS unit_name,
         slot2_l3 AS l3_cid,
         s1_id, c0_id, phase,
         SUM(r.sum_product2) / NULLIF(SUM(r.intersecting_txn), 0) AS phase_multiplier_kit
  FROM redemption_data r
  GROUP BY 1,2,3,4,5
) foo
),

base_fixqty AS (
    SELECT DISTINCT 
        pdm.product_id, pdm.l3_cid, pdm.s0_id, pdm.s1_id,
        pdm.c0_id, 
        1 as phase, subq2.buy_qty, pdm.unit_name
    FROM %2$s pdm
   
    INNER JOIN (
		select boup.product_id, bou.units_count as buy_qty
		from price_promo.tb_bxgy_offer_units bou
		join price_promo.tb_bxgy_offer_unit_products boup 
          on bou.bxgy_offer_units_id = boup.bxgy_offer_units_id 
		where bxgy_offer_id in 
		(
		  select bxgy_offer_id
		  from price_promo.tb_bxgy_offer tbo 
		  where promo_id = %5$s
		)
    ) subq2 on pdm.product_id = subq2.product_id
),

redemption_data_fixqty AS (
  SELECT base.*, 
         COALESCE(c.final_redemption_qty, 0.2) as phase_multiplier_fixqty
  FROM price_promo.tb_fixed_qty_redemption_class c
  INNER JOIN base_fixqty base
      ON c.l3_cid = base.l3_cid
     AND c.c0_id = base.c0_id 
     AND c.s1_id = base.s1_id 
     AND c.phase = base.phase 
     AND c.qty_bucket = base.buy_qty
),

combined_kit_fixqty AS (
  SELECT
    rdf.l3_cid,
    rdf.s1_id, rdf.c0_id, rdf.phase, rdf.unit_name,
    lfp.phase_multiplier_kit,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY rdf.phase_multiplier_fixqty)
      AS median_phase_multiplier_fixqty
  FROM redemption_data_fixqty rdf
  JOIN long_format_phase lfp
    ON lfp.l3_cid = rdf.l3_cid
   AND lfp.s1_id = rdf.s1_id
   AND lfp.c0_id = rdf.c0_id
   AND lfp.phase = rdf.phase
   AND lfp.unit_name = rdf.unit_name
  GROUP BY rdf.l3_cid, rdf.s1_id, rdf.c0_id, rdf.phase, rdf.unit_name, lfp.phase_multiplier_kit
),

slot2_multiplier_data AS (
  SELECT ckf.*, 
         ckf.phase_multiplier_kit * ckf.median_phase_multiplier_fixqty * %4$L::float AS phase_multiplier
  FROM combined_kit_fixqty ckf
  WHERE unit_name = 'Y'
),

slot1_multiplier_data AS (
  SELECT ckf.*, 
         ckf.phase_multiplier_kit * ckf.median_phase_multiplier_fixqty * foo.avg_slot2_multiplier AS phase_multiplier
  FROM combined_kit_fixqty ckf
  CROSS JOIN (SELECT AVG(phase_multiplier) AS avg_slot2_multiplier FROM slot2_multiplier_data) foo
  WHERE unit_name = 'X'
)

SELECT DISTINCT
    df.promo_id,
    df.scenario_id,
    df.product_id,
    df.l3_cid,
    df.s1_id,
    df.c0_id,
    df.offer_type_id,
    df.offer_type,
    df.cost,
    df.cost AS original_cost,
    df.current_price,
    foo.phase_multiplier AS sf_penetration_factor
FROM (
    SELECT * FROM slot2_multiplier_data
    UNION
    SELECT * FROM slot1_multiplier_data
) foo
INNER JOIN %2$s df
  ON foo.l3_cid = df.l3_cid
 AND foo.s1_id = df.s1_id
 AND foo.c0_id = df.c0_id
 AND foo.unit_name = df.unit_name;

$sql$,
    temp_table_name,
    temp_disc_changes,
    psd_bxgy_id,
    bxgy_disc_value,
    var_promo_id
);

    ------------------------------------------------------------------
    -- Execute main query
    ------------------------------------------------------------------
    RAISE NOTICE '[DEBUG] Executing BXGY pipeline...';
    EXECUTE query3_bxgy;

    ------------------------------------------------------------------
    -- Debug: output rowcount
    ------------------------------------------------------------------
--    EXECUTE format('SELECT COUNT(*) FROM %I', temp_table_name)
--    INTO STRICT end_time;
--    RAISE NOTICE '[DEBUG] output rowcount = %', end_time;

    end_time := clock_timestamp();
    RAISE NOTICE '[DEBUG] completed in %', end_time - start_time;
END;
$procedure$
;

