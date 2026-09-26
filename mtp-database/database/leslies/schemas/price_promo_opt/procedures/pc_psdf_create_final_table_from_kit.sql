--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_kit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_psdf_create_final_table_from_kit

DROP PROCEDURE IF EXISTS price_promo_opt.pc_psdf_create_final_table_from_kit ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_kit(IN temp_table_name character varying, IN var_promo_id integer, IN var_scenario_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
 
start_time timestamp; end_time timestamp; query3_kit Text; kit_id int4; slot_count int2; 

begin


    SELECT DISTINCT NULLIF(json_element.value->>'kit_offer_id', 'null')
    INTO kit_id
    FROM price_promo.ps_scenario_discounts psd
    CROSS JOIN LATERAL jsonb_each(psd.scenario_data) AS json_element
    WHERE psd.promo_id = var_promo_id
      AND NULLIF(json_element.value->>'scenario_id', 'null')::int = var_scenario_id
    LIMIT 1;

select total_number_of_units 
into slot_count
from price_promo.tb_kit_offer
where promo_id = var_promo_id
and kit_offer_id = kit_id;

raise notice 'inside kit offer - slot counts calculated ';

if slot_count = 2 then

raise notice 'inside slot = 2 for kit offer ';

query3_kit := format(
$sql$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

-- get the cross products of the hierarchies as 2 different slots for phase tables querying. 
WITH base AS 
(
  SELECT
    distinct a.l0_cid as slot1_l0, a.l1_cid as slot1_l1, a.l2_cid as slot1_l2, a.l3_cid as slot1_l3,
    b.l0_cid as slot2_l0, b.l1_cid as slot2_l1, b.l2_cid as slot2_l2, b.l3_cid as  slot2_l3, sub1.s0_id, sub1.c0_id, sub1.phase
FROM (
    SELECT DISTINCT pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'A'
) a
CROSS JOIN (
    SELECT DISTINCT pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'B'
) b
cross join (SELECT DISTINCT s0_id, c0_id, phase 
			from price_promo_opt_temp.promo_scenario_discount_filter_%s_%s_forecast) sub1

),

-- Join with redemption tables depending on c0_id and slot level
redemption_data AS (
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

  FROM base b
),

--final_redemption as 
--(
--SELECT *,
--  CASE WHEN slot1_l3 = slot2_l3 THEN 0.5 ELSE COALESCE(phase_multiplier1, 1.0) END AS phase_multiplier1_final,
--  CASE WHEN slot1_l3 = slot2_l3 THEN 0.5 ELSE COALESCE(phase_multiplier2, 1.0) END AS phase_multiplier2_final
--FROM redemption_data rd
--),

long_format_phase as (
select distinct slot_tag, l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, phase, phase_multiplier
from (
	SELECT 
		'A' as slot_tag,
	    slot1_l0 AS l0_cid,
	    slot1_l1 AS l1_cid,
	    slot1_l2 AS l2_cid,
	    slot1_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5,6,7,8
	
	UNION ALL
	
	SELECT  
		'B' as slot_tag,
	    slot2_l0 AS l0_cid,
	    slot2_l1 AS l1_cid,
	    slot2_l2 AS l2_cid,
	    slot2_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5,6,7,8
	) foo
),



fixqty_base AS (
    SELECT DISTINCT 
        pdm.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid, pdm.s0_id, 
        pdm.c0_id, pdm.customer_id, pdm.phase, pdm.units_count as buy_qty
    FROM %s_forecast pdm
),

fixqty_redemption_data AS (
    SELECT fixqty_base.*,
        CASE 
            WHEN fixqty_base.c0_id = 1 THEN (
                COALESCE(
                    (
                        SELECT p.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_product p
                        WHERE p.product_code = fixqty_base.product_id::text
                          AND p.c0_id = 1
                          AND p.s0_id = fixqty_base.s0_id
                          AND p.phase = fixqty_base.phase
                          AND p.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass s
                        WHERE s.l3_cid = fixqty_base.l3_cid
						  and s.l2_cid = fixqty_base.l2_cid and s.l1_cid = fixqty_base.l1_cid 
						  and s.l0_cid = fixqty_base.l0_cid
                          AND s.c0_id = 1
                          AND s.s0_id = fixqty_base.s0_id
                          AND s.phase = fixqty_base.phase
                          AND s.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT o.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_overall o
                        WHERE o.c0_id = 1
                          AND o.s0_id = fixqty_base.s0_id
                          AND o.phase = fixqty_base.phase
                          AND o.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    0.2
                )
            )
            WHEN fixqty_base.c0_id = 2 THEN (
                COALESCE(
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass_commercial s
                        WHERE s.l3_cid = fixqty_base.l3_cid
						  and s.l2_cid = fixqty_base.l2_cid and s.l1_cid = fixqty_base.l1_cid
						  and s.l0_cid = fixqty_base.l0_cid
                          AND s.c0_id = 2
                          AND s.c2_id = fixqty_base.customer_id
                          AND s.phase = fixqty_base.phase
                          AND s.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT o.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_overall_commercial o
                        WHERE o.c0_id = 2
                          AND o.phase = fixqty_base.phase
                          AND o.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    0.2 
                )
            )
            ELSE 1.0
        END AS phase_multiplier
    FROM fixqty_base
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
				    (rd.phase_multiplier * ph.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
				        AS effective_discount,
				
				    df.cost,
				    df.cost AS original_cost,
				    df.current_price,
				
				    -- discounted_price calculation
				    df.current_price * (100 - ((rd.phase_multiplier * ph.phase_multiplier * df.calculated_incremental) /
				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
				
				    -- sales_units and baseline_sales_units
				    df.baseline_sales + (df.calculated_incremental * rd.phase_multiplier * ph.phase_multiplier) AS sales_units,
				    df.baseline_sales AS baseline_sales_units,
				
				    df.rebate,
				    df.shipping_cost,
    
    				df.offer_type_combined_display_name
				FROM %s_forecast df
                INNER JOIN long_format_phase ph
                    ON df.l0_cid = ph.l0_cid
					AND df.l1_cid = ph.l1_cid
					AND df.l2_cid = ph.l2_cid
                    AND df.l3_cid = ph.l3_cid
                    AND df.c0_id = ph.c0_id
                    AND df.s0_id = ph.s0_id
                    AND df.phase = ph.phase
					and df.unit_name = ph.slot_tag
				Inner join fixqty_redemption_data rd 
					    ON df.product_id = rd.product_id
					    AND df.s0_id = rd.s0_id
					    AND df.c0_id = rd.c0_id
						and df.customer_id = rd.customer_id
--            ) sub1
        $sql$, temp_table_name, temp_table_name, 
var_promo_id, var_scenario_id, var_promo_id, var_scenario_id,
var_promo_id, var_scenario_id,

temp_table_name,

temp_table_name);

        RAISE NOTICE 'Executing query3_kit: %', query3_kit;
        EXECUTE query3_kit;


end if; 


----------------------------------


if slot_count = 3 then 

query3_kit := format(
$sql$
DROP TABLE IF EXISTS %s;
CREATE UNLOGGED TABLE %s AS

-- get the cross products of the hierarchies as 2 different slots for phase tables querying. 
WITH base AS 
(

  SELECT
    distinct a.l0_cid as slot1_l0, a.l1_cid as slot1_l1, a.l2_cid as slot1_l2, a.l3_cid as slot1_l3,
    b.l0_cid as slot2_l0, b.l1_cid as slot2_l1, b.l2_cid as slot2_l2, b.l3_cid as  slot2_l3, 
	c.l0_cid as slot3_l0, c.l1_cid as slot3_l1, c.l2_cid as slot3_l2, c.l3_cid as  slot3_l3, sub1.s0_id, sub1.c0_id, sub1.phase
FROM (
    SELECT DISTINCT pf.product_id, pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'A'
) a
CROSS JOIN (
    SELECT DISTINCT pf.product_id, pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'B'
) b

CROSS JOIN (
    SELECT DISTINCT pf.product_id, pdm.l0_cid, pdm.l1_cid , pdm.l2_cid, pdm.l3_cid
    FROM price_promo_opt_temp.promo_product_filter_resim_%s_%s pf 
    join price_promo.product_master pdm on pf.product_id = pdm.product_id
    WHERE unit_name = 'C'
) c

cross join (SELECT DISTINCT s0_id, c0_id, phase 
			from price_promo_opt_temp.promo_scenario_discount_filter_%s_%s_forecast) sub1

),

-- Join with redemption tables depending on c0_id and slot level
redemption_data AS (
  SELECT 
    b.*,

COALESCE(
        -- subclass
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_subclass r
            WHERE r.slot1 = b.slot1_l3
              AND r.slot2 = b.slot2_l3
			  AND r.slot3 = b.slot3_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_class r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.slot3 = b.slot3_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_overall r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.slot3 = b.slot3_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_class_commercial r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.slot3 = b.slot3_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_overall_commercial r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.slot3 = b.slot3_l0
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
            FROM price_promo.tb_kit_offer_3slot_redemption_subclass r
            WHERE r.slot1 = b.slot2_l3
              AND r.slot2 = b.slot1_l3
			  AND r.slot3 = b.slot3_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_class r
            WHERE r.slot1 = b.slot2_l2
              AND r.slot2 = b.slot1_l2
              AND r.slot3 = b.slot3_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_overall r
            WHERE r.slot1 = b.slot2_l0
              AND r.slot2 = b.slot1_l0
              AND r.slot3 = b.slot3_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_class_commercial r
            WHERE r.slot1 = b.slot2_l2
              AND r.slot2 = b.slot1_l2
              AND r.slot3 = b.slot3_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_overall_commercial r
            WHERE r.slot1 = b.slot2_l0
              AND r.slot2 = b.slot1_l0
              AND r.slot3 = b.slot3_l0
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        0.5) as sum_product2,


COALESCE(
        -- subclass
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_subclass r
            WHERE r.slot1 = b.slot3_l3
              AND r.slot2 = b.slot2_l3
			  AND r.slot3 = b.slot1_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_class r
            WHERE r.slot1 = b.slot3_l2
              AND r.slot2 = b.slot2_l2
              AND r.slot3 = b.slot1_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_overall r
            WHERE r.slot1 = b.slot3_l0
              AND r.slot2 = b.slot2_l0
              AND r.slot3 = b.slot1_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_class_commercial r
            WHERE r.slot1 = b.slot3_l2
              AND r.slot2 = b.slot2_l2
              AND r.slot3 = b.slot1_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.sum_product
            FROM price_promo.tb_kit_offer_3slot_redemption_overall_commercial r
            WHERE r.slot1 = b.slot3_l0
              AND r.slot2 = b.slot2_l0
              AND r.slot3 = b.slot1_l0
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        0.5) as sum_product3, 

COALESCE(
        -- subclass
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_3slot_redemption_subclass r
            WHERE r.slot1 = b.slot1_l3
              AND r.slot2 = b.slot2_l3
			  AND r.slot3 = b.slot3_l3
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),

        -- class
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_3slot_redemption_class r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.slot3 = b.slot3_l2
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_3slot_redemption_overall r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.slot3 = b.slot3_l0
              AND r.s0_id = b.s0_id
              AND r.c0_id = 1
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- class commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_3slot_redemption_class_commercial r
            WHERE r.slot1 = b.slot1_l2
              AND r.slot2 = b.slot2_l2
              AND r.slot3 = b.slot3_l2
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        -- overall commercial
        (
--            SELECT SUM(r.sum_product) / NULLIF(SUM(r.intersecting_txn), 0)
            select r.intersecting_txn
            FROM price_promo.tb_kit_offer_3slot_redemption_overall_commercial r
            WHERE r.slot1 = b.slot1_l0
              AND r.slot2 = b.slot2_l0
              AND r.slot3 = b.slot3_l0
              AND r.c0_id = 2
              AND r.phase = b.phase
--            GROUP BY r.slot1
        ),
        0.5) as intersecting_txn


  FROM base b
),

--final_redemption as 
--(
--SELECT *,
--  CASE WHEN slot1_l3 = slot2_l3 THEN 0.5 ELSE COALESCE(phase_multiplier1, 1.0) END AS phase_multiplier1_final,
--  CASE WHEN slot1_l3 = slot2_l3 THEN 0.5 ELSE COALESCE(phase_multiplier2, 1.0) END AS phase_multiplier2_final,
--  CASE WHEN slot1_l3 = slot3_l3 THEN 0.5 ELSE COALESCE(phase_multiplier3, 1.0) END AS phase_multiplier3_final
--FROM redemption_data rd
--),

long_format_phase as (
select distinct slot_tag, l0_cid, l1_cid, l2_cid, l3_cid, s0_id, c0_id, phase, phase_multiplier
from (
	SELECT  
		'A' as slot_tag,
	    slot1_l0 AS l0_cid,
	    slot1_l1 AS l1_cid,
	    slot1_l2 AS l2_cid,
	    slot1_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5,6,7,8
	
	UNION ALL
	
	SELECT  
		'B' as slot_tag,
	    slot2_l0 AS l0_cid,
	    slot2_l1 AS l1_cid,
	    slot2_l2 AS l2_cid,
	    slot2_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product2) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5,6,7,8

	UNION ALL 

	SELECT  
		'C' as slot_tag,
	    slot3_l0 AS l0_cid,
	    slot3_l1 AS l1_cid,
	    slot3_l2 AS l2_cid,
	    slot3_l3 AS l3_cid,
	    s0_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product3) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5,6,7,8

	) foo
),


fixqty_base AS (
    SELECT DISTINCT 
        pdm.product_id, pdm.l0_cid, pdm.l1_cid, pdm.l2_cid, pdm.l3_cid, pdm.s0_id, 
        pdm.c0_id, pdm.customer_id, pdm.phase, pdm.units_count as buy_qty
    FROM %s_forecast pdm
),

fixqty_redemption_data AS (
    SELECT fixqty_base.*,
        CASE 
            WHEN fixqty_base.c0_id = 1 THEN (
                COALESCE(
                    (
                        SELECT p.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_product p
                        WHERE p.product_code = fixqty_base.product_id::text
                          AND p.c0_id = 1
                          AND p.s0_id = fixqty_base.s0_id
                          AND p.phase = fixqty_base.phase
                          AND p.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass s
                        WHERE s.l3_cid = fixqty_base.l3_cid
						  and s.l2_cid = fixqty_base.l2_cid and s.l1_cid = fixqty_base.l1_cid 
						  and s.l0_cid = fixqty_base.l0_cid
                          AND s.c0_id = 1
                          AND s.s0_id = fixqty_base.s0_id
                          AND s.phase = fixqty_base.phase
                          AND s.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT o.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_overall o
                        WHERE o.c0_id = 1
                          AND o.s0_id = fixqty_base.s0_id
                          AND o.phase = fixqty_base.phase
                          AND o.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    0.2
                )
            )
            WHEN fixqty_base.c0_id = 2 THEN (
                COALESCE(
                    (
                        SELECT s.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_subclass_commercial s
                        WHERE s.l3_cid = fixqty_base.l3_cid
						  and s.l2_cid = fixqty_base.l2_cid and s.l1_cid = fixqty_base.l1_cid
						  and s.l0_cid = fixqty_base.l0_cid
                          AND s.c0_id = 2
                          AND s.c2_id = fixqty_base.customer_id
                          AND s.phase = fixqty_base.phase
                          AND s.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    (
                        SELECT o.final_redemption_qty
                        FROM price_promo.tb_fixed_qty_redemption_overall_commercial o
                        WHERE o.c0_id = 2
                          AND o.phase = fixqty_base.phase
                          AND o.qty_bucket = fixqty_base.buy_qty
                        LIMIT 1
                    ),
                    0.2 
                )
            )
            ELSE 1.0
        END AS phase_multiplier
    FROM fixqty_base
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
				    (rd.phase_multiplier * ph.phase_multiplier * df.calculated_incremental) / NULLIF(df.elasticity * df.baseline_sales * 0.01, 0)
				        AS effective_discount,
				
				    df.cost,
				    df.cost AS original_cost,
				    df.current_price,
				
				    -- discounted_price calculation
				    df.current_price * (100 - ((rd.phase_multiplier * ph.phase_multiplier * df.calculated_incremental) /
				       NULLIF(df.elasticity * df.baseline_sales * 0.01, 0))) * 0.01 AS discounted_price,
				
				    -- sales_units and baseline_sales_units
				    df.baseline_sales + (df.calculated_incremental * rd.phase_multiplier * ph.phase_multiplier) AS sales_units,
				    df.baseline_sales AS baseline_sales_units,
				
				    df.rebate,
				    df.shipping_cost,

					df.offer_type_combined_display_name
				FROM %s_forecast df
                INNER JOIN long_format_phase ph
                    ON df.l0_cid = ph.l0_cid
					AND df.l1_cid = ph.l1_cid
					AND df.l2_cid = ph.l2_cid
                    AND df.l3_cid = ph.l3_cid
                    AND df.c0_id = ph.c0_id
                    AND df.s0_id = ph.s0_id
                    AND df.phase = ph.phase
					and df.unit_name = ph.slot_tag
				Inner join fixqty_redemption_data rd 
					    ON df.product_id = rd.product_id
					    AND df.s0_id = rd.s0_id
					    AND df.c0_id = rd.c0_id
						and df.customer_id = rd.customer_id

        $sql$, temp_table_name, temp_table_name, 
var_promo_id, var_scenario_id, var_promo_id, var_scenario_id, var_promo_id, var_scenario_id,
var_promo_id, var_scenario_id,

temp_table_name,temp_table_name,
temp_table_name);

        RAISE NOTICE 'Executing query3_kit: %', query3_kit;
        EXECUTE query3_kit;

end if; 


end;
$procedure$
;
