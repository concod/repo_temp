--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_generate_promo_segments_ecom runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_generate_promo_segments_ecom

DROP FUNCTION if exists price_promo_opt.fn_generate_promo_segments_ecom;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_generate_promo_segments_ecom(p_promo_id integer)
 RETURNS TABLE(id text, brand text, channel text, market text, economicregioncode text, eventdescription text, discounttype text, startdate date, enddate date, merchandiselevel text, program text, customerchoicenumber bigint, merchandisehierarchyid text, locationnumber text, qualifyingquantity integer, ticketprice numeric, discountvalue numeric, sellingprice numeric)
 LANGUAGE sql
 STABLE
 SET enable_nestloop TO 'off'
AS $function$

WITH 
-- 1. Promo configuration
promo_configs AS MATERIALIZED (

select distinct a.*, 
		pm.promo_id,
		        start_date::DATE AS s_dt,
		        end_date::DATE AS e_dt,
		        price_promo.impute_special_characters(name) AS promo_name
		from
		(
			SELECT p_promo_id AS p_id, 99 AS priority, 'NORMAL' AS p_type
				union all
				(
					select a.promo_id, row_number() over (order by start_date desc, end_date - start_date + 1)  AS priority, 'TOD' AS p_type from price_promo.promo_master a
					join
					(select promo_id, start_date as current_sdt, end_date as current_edt 
					from price_promo.promo_master where promo_id = p_promo_id)b
					on a.start_date <= current_edt and a.end_date >= current_sdt
					where a.execution_metadata->>'offer_marketing_type' in ('Tod Deal','Marketing Event' ) and status in (4,8)
				)
		) a 
		inner join price_promo.promo_master pm on a.p_id = pm.promo_id
		    cross join lateral price_promo.fn_fetch_stores_for_promo(a.p_id) ps 
		    inner join pricesmart.tb_store_master sm on sm.store_id = ps.store_id
		    
		    WHERE sm.s1_name in ('ONLINE') 
),

-- 3. Raw pricing
raw_pricing AS MATERIALIZED (
    SELECT 
        pc.priority,
        pc.s_dt,
        pc.e_dt,
        f."Customer Choice ID"::BIGINT AS customer_choice_id,
        f."Program ID"::BIGINT AS program_id,
        f."Base Price"::NUMERIC AS ticketPrice,
        f."Offer Value"::NUMERIC AS offer_value,
		f."Program ID Online" as program_id_online,
		f."CC Num" as cc_num,
		f."Merchandise Subclass Id" as merchandise_subclass_id,
		
        CASE 
            WHEN f."Offer Type" = '% OFF' THEN 'PERCENTAGE_OFF'
            ELSE 'PRICE_POINT'
        END AS discountType,
        CASE 
            WHEN f."Offer Type" = '% OFF'
                THEN TRUNC(
                    (f."Base Price"::NUMERIC) *
                    (1 - (f."Offer Value"::NUMERIC) / 100.0), 2
                )
            ELSE f."Offer Value"::NUMERIC
        END AS sellingPrice,
        f."Program Name" AS prog_name,
        pc.promo_name
    FROM promo_configs pc
    
    CROSS JOIN LATERAL price_promo_opt.fn_step3_price_file_ecom_int(pc.p_id) f
    WHERE f."Finalized Flag" = 'Finalized' 
--        pd.promo_id IN (select promo_id from promo_configs where p_type = 'TOD')
),

-- 4. Universe (promo 369)
universe AS MATERIALIZED (
    SELECT DISTINCT customer_choice_id
    FROM raw_pricing r
    JOIN promo_configs pc 
        ON r.priority = pc.priority
    WHERE pc.p_id = p_promo_id
),

-- 5. Seam dates
seams AS MATERIALIZED (
    SELECT DISTINCT
        u.customer_choice_id,
        seam_date
    FROM universe u
    JOIN raw_pricing r
        ON u.customer_choice_id = r.customer_choice_id
    CROSS JOIN LATERAL (
        SELECT r.s_dt
        UNION
        SELECT r.e_dt + 1
    ) s(seam_date)
),

-- 6. Intervals
intervals AS MATERIALIZED (
    SELECT
        customer_choice_id,
        seam_date AS segment_start,
        (LEAD(seam_date) OVER (
            PARTITION BY customer_choice_id
            ORDER BY seam_date
        ) - 1)::DATE AS segment_end
    FROM seams
),

-- 7. Valid intervals (within promo 369)
valid_intervals AS MATERIALIZED (
    SELECT i.*
    FROM intervals i
    JOIN raw_pricing p
        ON i.customer_choice_id = p.customer_choice_id
    JOIN promo_configs pc
        ON p.priority = pc.priority
    WHERE pc.p_id = p_promo_id
      AND i.segment_start <= p.e_dt
      AND i.segment_end >= p.s_dt
      AND i.segment_end IS NOT NULL
),

-- 8. Segment pricing (priority logic)
segment_pricing AS MATERIALIZED (
    SELECT DISTINCT ON (v.customer_choice_id, v.segment_start)
        v.customer_choice_id,
        v.segment_start,
        v.segment_end,
        r.priority,
        r.program_id,
        r.ticketPrice,
        r.offer_value,
        r.sellingPrice,
        r.discountType,
        r.prog_name,
        r.promo_name,
		r.cc_num, r.merchandise_subclass_id,
        CASE WHEN r.priority <99 THEN '99' ELSE '' END AS id_suffix
    FROM valid_intervals v
    JOIN raw_pricing r
        ON v.customer_choice_id = r.customer_choice_id
    WHERE v.segment_start BETWEEN r.s_dt AND r.e_dt
    ORDER BY
        v.customer_choice_id,
        v.segment_start,
        r.priority ASC
)

-- 10. Final output
SELECT
    (39000 + DENSE_RANK() OVER (ORDER BY s.customer_choice_id))::TEXT
        || s.id_suffix AS id,
    'ON' as brand,
    'ONL' AS channel,
    'US' AS market,
    'US' AS economicRegionCode,
    s.promo_name AS eventDescription,
    s.discountType,
    s.segment_start AS startDate,
    s.segment_end AS endDate,
    'CUSTOMERCHOICE' AS merchandiseLevel,
    NULL AS program,
    cc_num::bigint AS customerChoiceNumber,
    merchandise_subclass_id AS merchandiseHierarchyId,
    NULL AS locationNumber,
    1 AS qualifyingQuantity,
    s.ticketPrice,
    CASE
        WHEN s.discountType = 'PERCENTAGE_OFF'
            THEN s.offer_value * 0.01
        ELSE s.offer_value
    END AS discountValue,
    s.sellingPrice
FROM segment_pricing s;
$function$
;
