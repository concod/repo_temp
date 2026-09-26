--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_psdf_create_final_table_from_kit runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_psdf_create_final_table_from_kit

DROP PROCEDURE if exists price_promo_opt.pc_psdf_create_final_table_from_kit;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_psdf_create_final_table_from_kit(IN temp_table_name character varying, IN temp_disc_changes character varying, IN var_promo_id integer, IN var_scenario_id integer)
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
  SELECT distinct a.l3_cid as slot1_l3, b.l3_cid as slot2_l3, s1_id, c0_id, 1 as phase
	FROM 
	(
	    SELECT DISTINCT l3_cid, s1_id, c0_id
	    FROM %s pf 
	    WHERE unit_name = 'A'
	) a
	CROSS JOIN 
	(
	    SELECT DISTINCT l3_cid
	    FROM %s pf 
	    WHERE unit_name = 'B'
	) b

),

-- Join with redemption tables depending on c0_id and slot level
redemption_data AS 
(
	SELECT b.*, 
	case when (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3) then sum_product else 0.5 end as sum_product1,
	case when (r.slot1 = b.slot2_l3 and r.slot2 = b.slot1_l3) then sum_product else 0.5 end as sum_product2,
	case when (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3) then intersecting_txn else 0.5 end as intersecting_txn
	
	FROM price_promo.tb_kit_offer_redemption_class r
	inner join base b on (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3) or (r.slot1 = b.slot2_l3 and r.slot2 = b.slot1_l3)
),


long_format_phase as (
select distinct unit_name, l3_cid, s1_id, c0_id, phase, phase_multiplier
from (
	SELECT 
		'A' as unit_name,
	    slot1_l3 AS l3_cid,
	    s1_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5
	
	UNION ALL
	
	SELECT  
		'B' as unit_name,
	    slot2_l3 AS l3_cid,
	    s1_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product2) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5
	) foo
),


fixqty_redemption_data AS (
    SELECT a.*, COALESCE(b.final_redemption_qty, 0.2) as phase_multiplier

    FROM %s a

	inner join price_promo.tb_fixed_qty_redemption_class b 

	on a.l3_cid = b.l3_cid and a.s1_id = b.s1_id and a.c0_id = b.c0_id and a.units_count = b.qty_bucket
)


	SELECT distinct
	    df.promo_id,
	    df.scenario_id,
	    df.product_id,
	    df.l3_cid,
	    df.s1_id,
	    df.c0_id,
	    coalesce(rd.phase_multiplier * ph.phase_multiplier,0.2) AS sf_penetration_factor

	FROM %s df
    left JOIN long_format_phase ph using (l3_cid, c0_id, s1_id, unit_name)
	left join fixqty_redemption_data rd using (product_id, c0_id, s1_id);

        $sql$, 
temp_table_name, temp_table_name, 
temp_disc_changes, temp_disc_changes,
temp_disc_changes, temp_disc_changes
);

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
    distinct a.l3_cid as slot1_l3,
    b.l3_cid as  slot2_l3, 
	c.l3_cid as  slot3_l3, s1_id, c0_id, 1 as phase
FROM (
    SELECT DISTINCT l3_cid, s1_id, c0_id
    FROM %s pf 
    WHERE unit_name = 'A'
) a
CROSS JOIN (
    SELECT DISTINCT l3_cid
    FROM %s pf 
    WHERE unit_name = 'B'
) b

CROSS JOIN (
    SELECT DISTINCT l3_cid
    FROM %s pf 
    WHERE unit_name = 'C'
) c

),

-- Join with redemption tables depending on c0_id and slot level
redemption_data AS (

SELECT b.*, 
	case when (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3 AND r.slot3 = b.slot3_l3) then sum_product else 0.5 end as sum_product1,
	case when (r.slot1 = b.slot2_l3 and r.slot2 = b.slot1_l3 AND r.slot3 = b.slot3_l3) then sum_product else 0.5 end as sum_product2,
	case when (r.slot1 = b.slot3_l3 and r.slot2 = b.slot1_l3 AND r.slot3 = b.slot1_l3) then sum_product else 0.5 end as sum_product3,
	case when (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3 AND r.slot3 = b.slot3_l3) then intersecting_txn else 0.5 end as intersecting_txn
	
	FROM price_promo.tb_kit_offer_3slot_redemption_class r
	inner join base b on (r.slot1 = b.slot1_l3 and r.slot2 = b.slot2_l3 AND r.slot3 = b.slot3_l3) 
	or (r.slot1 = b.slot2_l3 and r.slot2 = b.slot1_l3 AND r.slot3 = b.slot3_l3)
	or (r.slot1 = b.slot3_l3 and r.slot2 = b.slot1_l3 AND r.slot3 = b.slot1_l3)
),

long_format_phase as (
select distinct unit_name, l3_cid, s1_id, c0_id, phase, phase_multiplier
from (
	SELECT  
		'A' as unit_name,
	    slot1_l3 AS l3_cid,
	    s1_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product1) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5
	
	UNION ALL
	
	SELECT  
		'B' as unit_name,
	    slot2_l3 AS l3_cid,
	    s1_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product2) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5

	UNION ALL 

	SELECT  
		'C' as unit_name,
	    slot3_l3 AS l3_cid,
	    s1_id,
	    c0_id,
	    phase,
	    SUM(r.sum_product3) / NULLIF(SUM(r.intersecting_txn), 0) as phase_multiplier
	FROM redemption_data r
	group by 1,2,3,4,5

	) foo
),


fixqty_redemption_data AS (
    SELECT a.*, COALESCE(b.final_redemption_qty, 0.2) as phase_multiplier

    FROM %s a

	inner join price_promo.tb_fixed_qty_redemption_class b 

	on a.l3_cid = b.l3_cid and a.s1_id = b.s1_id and a.c0_id = b.c0_id and a.units_count = b.qty_bucket
)


				SELECT distinct
				    df.promo_id,
				    df.scenario_id,
				    df.product_id,
				    df.l3_cid,
				    df.s1_id,
				    df.c0_id,
				    df.cost,
				    df.cost AS original_cost,
				    df.current_price,
				
					coalesce(rd.phase_multiplier * ph.phase_multiplier,0.2) AS sf_penetration_factor

					FROM %s df
				    left JOIN long_format_phase ph using (l3_cid, c0_id, s1_id, unit_name)
					left join fixqty_redemption_data rd using (product_id, c0_id, s1_id);

        $sql$, 
temp_table_name, temp_table_name,
temp_disc_changes, temp_disc_changes,
temp_disc_changes, temp_disc_changes,
temp_disc_changes);

        RAISE NOTICE 'Executing query3_kit: %', query3_kit;
        EXECUTE query3_kit;

end if; 


end;
$procedure$
;

