--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_bxgy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_final_table_from_bxgy

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_final_table_from_bxgy ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_bxgy(IN temp_table_name character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE

start_time timestamp; end_time timestamp; query3_bxgy Text; psd_bxgy_id int4; bxgy_disc_value float;

begin


    SELECT DISTINCT NULLIF(json_element.value->>'bxgy_offer_id', 'null')
    INTO psd_bxgy_id
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;

-- Assign discount value to a variable
	SELECT case when bxgy_offer_type_id = 1 then 1 
				when bxgy_offer_type_id = 2 then tbo.discount_value * 0.01
			end as disc_value
	INTO bxgy_disc_value
	FROM price_promo.tb_bxgy_offer tbo
	WHERE promo_id = var_promo_id 
	and bxgy_offer_id = psd_bxgy_id
	LIMIT 1;

query3_bxgy := format(
$sql$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

WITH base_kit AS 
(
  SELECT
    distinct a.l0_cid as slot1_l0, a.l1_cid as slot1_l1, a.l2_cid as slot1_l2, a.l3_cid as slot1_l3,
    b.l0_cid as slot2_l0, b.l1_cid as slot2_l1, b.l2_cid as slot2_l2, b.l3_cid as  slot2_l3, sub1.s0_id, sub1.c0_id, sub1.phase
FROM (
    SELECT DISTINCT pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'X'
) a
CROSS JOIN (
    SELECT DISTINCT pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'Y'
) b
cross join (SELECT DISTINCT s0_id, c0_id, phase 
			from price_promo_opt_temp.promo_scenario_discount_filter_%s_%s_forecast) sub1

),

redemption_data_kit AS (
  SELECT 
    b.*,

COALESCE(
        -- subclass
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_subclass r
            WHERE r.slot1 = b.slot1_l3
              AND r.slot2 = b.slot2_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_class r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_overall r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_class_commercial r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_overall_commercial r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        0.5) as sum_product1,

-- Inverted slot1/slot2 logic for phase_multiplier2

COALESCE(
        -- subclass
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_subclass r
            WHERE r.slot1 = b.slot2_l3
              AND r.slot2 = b.slot1_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_class r
            WHERE r.slot1 = b.slot2_l2
              AND r.slot2 = b.slot1_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_overall r
            WHERE r.slot1 = b.slot2_l0
              AND r.slot2 = b.slot1_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_class_commercial r
            WHERE r.slot1 = b.slot2_l2
              AND r.slot2 = b.slot1_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_redemption_overall_commercial r
            WHERE r.slot1 = b.slot2_l2
              AND r.slot2 = b.slot1_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        0.5) as sum_product2, 


COALESCE(
        -- subclass
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_redemption_subclass r
            WHERE r.slot1 = b.slot1_l3
              AND r.slot2 = b.slot2_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_redemption_class r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_redemption_overall r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_redemption_class_commercial r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_redemption_overall_commercial r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        0.5) as intersecting_txn
FROM base_kit b
),

--final_redemption AS (
--    SELECT *,
--        CASE WHEN slot1_l3 = slot2_l3 THEN 0.5 ELSE COALESCE(phase_multiplier1, 1.0) END AS phase_multiplier1_kit,
--        CASE WHEN slot1_l3 = slot2_l3 THEN 0.5 ELSE COALESCE(phase_multiplier2, 1.0) END AS phase_multiplier2_kit
--    FROM redemption_data_kit
--),

long_format_phase AS (
    SELECT  'X' as unit_name,
	    slot1_l0 AS l0_cid,
	    slot1_l1 AS l1_cid,
	    slot1_l2 AS l2_cid,
	    slot1_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier_kit
    FROM redemption_data_kit r 
	group by 1,2,3,4,5,6,7,8
    UNION ALL
    SELECT 'Y' as unit_name,
	    slot2_l0 AS l0_cid,
	    slot2_l1 AS l1_cid,
	    slot2_l2 AS l2_cid,
	    slot2_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier_kit
    FROM redemption_data_kit r
	group by 1,2,3,4,5,6,7,8
),


base_fixqty AS (
    SELECT DISTINCT 
        pdm.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid, pdm.s0_id, 
        pdm.c0_id, pdm.customer_id, subq.phase, subq2.buy_qty, pdm.unit_name
    FROM %s_forecast pdm
    CROSS JOIN (
        SELECT DISTINCT
            CASE 
                WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 3 AND 5 THEN 1
                WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 6 AND 7 THEN 2
                WHEN EXTRACT(MONTH FROM recommendation_date) BETWEEN 8 AND 9 THEN 3
                ELSE 4
            END AS phase
        FROM (
            SELECT generate_series(pm.start_date, pm.end_date, '1 day')::date AS recommendation_date
            FROM price_promo.promo_master pm
            WHERE pm.promo_id = %s
        ) sub1
        INNER JOIN global.tb_fiscal_date_mapping tfdm ON sub1.recommendation_date = tfdm.date
    ) subq
    INNER JOIN (
		select boup.product_id, bou.units_count as buy_qty
		from price_promo.tb_bxgy_offer_units bou
		join price_promo.tb_bxgy_offer_unit_products boup on bou.bxgy_offer_units_id = boup.bxgy_offer_units_id 
		where bxgy_offer_id in 
		(
		select bxgy_offer_id
		from price_promo.tb_bxgy_offer tbo 
		where promo_id = %s
		)
    ) subq2 on pdm.product_id = subq2.product_id
),

redemption_data_fixqty AS (
    SELECT base.*,
        CASE 
            WHEN base.c0_id = 1 THEN (
                COALESCE(
                    (SELECT final_redemption_qty FROM price_promo.tb_fixed_qty_redemption_product p WHERE p.product_code = base.product_id::text AND p.c0_id = 1 AND p.s0_id = base.s0_id AND p.phase = base.phase AND p.qty_bucket = base.buy_qty),
                    (SELECT final_redemption_qty FROM price_promo.tb_fixed_qty_redemption_subclass s WHERE s.l0_cid = base.l0_cid AND s.l1_cid = base.l1_cid AND s.l2_cid = base.l2_cid AND s.l3_cid = base.l3_cid AND s.c0_id = 1 AND s.s0_id = base.s0_id AND s.phase = base.phase AND s.qty_bucket = base.buy_qty),
                    (SELECT final_redemption_qty FROM price_promo.tb_fixed_qty_redemption_overall o WHERE o.c0_id = 1 AND o.s0_id = base.s0_id AND o.phase = base.phase AND o.qty_bucket = base.buy_qty),
                    1.0
                )
            )
            WHEN base.c0_id = 2 THEN (
                COALESCE(
                    (SELECT final_redemption_qty FROM price_promo.tb_fixed_qty_redemption_subclass_commercial s WHERE s.l0_cid = base.l0_cid AND s.l1_cid = base.l1_cid AND s.l2_cid = base.l2_cid and s.l3_cid = base.l3_cid AND s.c0_id = 2 AND s.c2_id = base.customer_id AND s.phase = base.phase AND s.qty_bucket = base.buy_qty),
                    (SELECT final_redemption_qty FROM price_promo.tb_fixed_qty_redemption_overall_commercial o WHERE o.c0_id = 2 AND o.phase = base.phase AND o.qty_bucket = base.buy_qty),
                    1.0
                )
            )
            ELSE 1.0
        END AS phase_multiplier_fixqty
    FROM base_fixqty base
),


combined_kit_fixqty as (
SELECT 
    rdf.l0_cid,
    rdf.l1_cid,
    rdf.l2_cid,
    rdf.l3_cid,
    rdf.s0_id,
    rdf.c0_id,
    rdf.phase,
    rdf.unit_name,
    lfp.phase_multiplier_kit,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY rdf.phase_multiplier_fixqty) AS median_phase_multiplier_fixqty
FROM redemption_data_fixqty rdf
JOIN long_format_phase lfp 
  USING (l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, phase, unit_name)
GROUP BY 
    rdf.l0_cid,
    rdf.l1_cid,
    rdf.l2_cid,
    rdf.l3_cid,
    rdf.s0_id,
    rdf.c0_id,
    rdf.phase,
    rdf.unit_name,
    lfp.phase_multiplier_kit

),

slot2_multiplier_data as ( 
select ckf.*, ckf.phase_multiplier_kit * ckf.median_phase_multiplier_fixqty * %s as phase_multiplier
from combined_kit_fixqty ckf
where unit_name = 'Y'

),


slot1_multiplier_data as ( 
select ckf.*, ckf.phase_multiplier_kit * ckf.median_phase_multiplier_fixqty * foo.avg_slot2_multiplier as phase_multiplier
from combined_kit_fixqty ckf
cross join (select avg(phase_multiplier) as avg_slot2_multiplier from slot2_multiplier_data) foo 
where unit_name = 'X'

)


				SELECT
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
				    df.l0_cid,
				    df.l1_cid,
				    df.l2_cid,
				    df.l3_cid,
				    df.s0_id,
				    df.s3_id,
				    CONCAT(df.s0_id, '_', df.s3_id) AS store_hierarchy,
				    df.customer_id,
				    df.c0_id,
				    df.recommendation_date AS date,
				    df.recommendation_date,
				    df.phase,
				    df.week_start_date,
				    df.offer_type_id,
				    df.offer_type,
				    df.c0_id AS customer_type,
				    df.calculated_discount,
					df.elasticity,
				
				    -- derived metrics from first query logic
				    (foo.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
				        AS effective_discount,
				
				    df.cost,
				    df.cost AS original_cost,
				    df.current_price,
				
				    -- discounted_price calculation
				    df.current_price * (100 - ((foo.phase_multiplier * df.calculated_incremental) /
				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
				
				    -- sales_units and baseline_sales_units
				    df.baseline_sales + (df.calculated_incremental * foo.phase_multiplier) AS sales_units,
				    df.baseline_sales AS baseline_sales_units,
				
				    df.rebate,
				    df.shipping_cost,
    
    				df.offer_type_combined_display_name
					from (
						select * from slot2_multiplier_data
						union 
						select * from slot1_multiplier_data
					) foo 
					inner join %s_forecast df 
					using (l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, phase, unit_name) 


$sql$,

temp_table_name, temp_table_name, 
var_promo_id, var_scenario_id, var_promo_id, var_scenario_id, var_promo_id, var_scenario_id,

temp_table_name, var_promo_id, var_promo_id,
bxgy_disc_value,
  
temp_table_name

);

RAISE NOTICE 'Executing query3_bxgy: %', query3_bxgy;
EXECUTE query3_bxgy;


end;
$procedure$
;
