--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_baseprice_segments runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_baseprice_segments

DROP FUNCTION if exists price_promo_opt.fn_baseprice_segments;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_baseprice_segments(p_promo_ids integer[], p_promo_start date, p_promo_end date)
 RETURNS TABLE(product_id integer, product_level_id integer, store_id integer, store_level_id integer, s0_id integer, s1_id integer, store_reco_level character varying, segment_start date, segment_end date, promo_base_price numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN

RETURN QUERY

WITH cte0 AS (
    SELECT DISTINCT 
       		a.product_id, a.product_level_id,
            a.store_id, a.store_level_id,
            a.start_date, 
            a.end_date, 
            b.promo_base_price, 
            b.effective_from_date, 
            b.effective_till_date,
            GREATEST(a.start_date, b.effective_from_date) AS promo_start_date,
            LEAST(a.end_date, b.effective_till_date) AS promo_end_date
        FROM price_promo_opt.fn_product_store_details_baseprice(p_promo_ids) a
        LEFT JOIN price_promo.tb_product_store_price b
            ON a.product_id = b.product_id 
           AND a.store_id = b.store_id
           AND a.start_date <= b.effective_till_date 
           AND a.end_date >= b.effective_from_date
),

cte1 AS (
    SELECT 
            b.*,
            CASE 
                WHEN b.next_promo_start > b.promo_end_date + interval '1 day'
                THEN b.promo_end_date + interval '1 day'
                ELSE NULL
            END AS missing_start,
            CASE 
                WHEN b.next_promo_start > b.promo_end_date + interval '1 day'
                THEN b.next_promo_start - interval '1 day'
                ELSE NULL
            END AS missing_end
        FROM (
            SELECT 
                c0.*,
                LEAD(c0.promo_start_date) OVER (
                    PARTITION BY c0.product_id, c0.store_id 
                    ORDER BY c0.promo_start_date
                ) AS next_promo_start,
                LEAD(c0.promo_end_date) OVER (
                    PARTITION BY c0.product_id, c0.store_id 
                    ORDER BY c0.promo_start_date
                ) AS next_promo_end
            FROM cte0 c0
        ) b
),

cte2 AS (
     SELECT 
            a1.product_id, a1.product_level_id,
            a1.store_id, a1.store_level_id,
            a1.missing_start1, 
            CASE 
                WHEN a1.missing_start1 IS NOT NULL 
                THEN a1.min_start - interval '1 day' 
                ELSE NULL 
            END AS missing_end1,
            a1.missing_start2,
            CASE 
                WHEN a1.missing_start2 IS NOT NULL 
                THEN p_promo_end
                ELSE NULL 
            END AS missing_end2
        FROM (
            SELECT 
                a.product_id, a.product_level_id,
                a.store_id, a.store_level_id,
                a.min_start, 
                a.max_end,
                CASE 
                    WHEN p_promo_start < a.min_start 
                    THEN p_promo_start
                    ELSE NULL 
                END AS missing_start1,
                CASE 
                    WHEN (a.max_end + interval '1 day') < p_promo_end
                    THEN a.max_end + interval '1 day'
                    ELSE NULL 
                END AS missing_start2
            FROM (
                SELECT 
                    c1.product_id, c1.product_level_id,
                    c1.store_id, c1.store_level_id,
                    MIN(c1.promo_start_date) AS min_start, 
                    MAX(c1.promo_end_date)   AS max_end
                FROM cte1 c1
                GROUP BY 1,2,3,4
            ) a
        ) a1
),

cte3 AS (
 
 SELECT 
            c0.product_id, c0.product_level_id,
            c0.store_id,  c0.store_level_id,
            c0.promo_start_date, 
            c0.promo_end_date, 
            c0.promo_base_price 
        FROM cte0 c0 
        
        UNION
        
        SELECT 
            a.product_id, a.product_level_id,
            a.store_id, a.store_level_id,
            a.missing_start, 
            a.missing_end, 
            b.promo_base_price 
        FROM cte1 a
        INNER JOIN price_promo.product_master b 
            ON a.product_id = b.product_id 
           AND a.missing_start <= b.promo_base_price_valid_to 
           AND a.missing_end   >= b.promo_base_price_valid_from 
         
        UNION
          
        SELECT 
            a.product_id, a.product_level_id,
            a.store_id, a.store_level_id, 
            a.missing_start1, 
            a.missing_end1, 
            b.promo_base_price 
        FROM cte2 a
        INNER JOIN price_promo.product_master b 
            ON a.product_id   = b.product_id 
           AND a.missing_start1 <= b.promo_base_price_valid_to 
           AND a.missing_end1   >= b.promo_base_price_valid_from 
         
        UNION
          
        SELECT 
            a.product_id, a.product_level_id,
            a.store_id, a.store_level_id, 
            a.missing_start2, 
            a.missing_end2, 
            b.promo_base_price 
        FROM cte2 a
        INNER JOIN price_promo.product_master b 
            ON a.product_id   = b.product_id 
           AND a.missing_start2 <= b.promo_base_price_valid_to 
           AND a.missing_end2   >= b.promo_base_price_valid_from
)

,ordered AS (
    SELECT 
            c3.*,
            LAG(c3.promo_end_date) OVER (
                PARTITION BY c3.product_id, c3.store_id
                ORDER BY c3.promo_start_date
            ) AS prev_end,
            LAG(c3.promo_base_price) OVER (
                PARTITION BY c3.product_id, c3.store_id
                ORDER BY c3.promo_start_date
            ) AS prev_price
        FROM cte3 c3
)

,grouped AS (
    SELECT 
            o.*,
            SUM(
                CASE 
                    WHEN o.prev_price = o.promo_base_price
                         AND o.promo_start_date = o.prev_end + INTERVAL '1 day'
                    THEN 0
                    ELSE 1
                END
            ) OVER (
                PARTITION BY o.product_id, o.store_id
                ORDER BY o.promo_start_date
            ) AS grp
        FROM ordered o
)

SELECT 
    g.product_id, g.product_level_id, g.store_id, g.store_level_id,
    sm.s0_id, sm.s1_id, sm.store_reco_level:: character varying as store_reco_level,
    MIN(g.promo_start_date)::Date AS segment_start,
    MAX(g.promo_end_date)::Date   AS segment_end,
    g.promo_base_price::numeric as promo_base_price
FROM grouped g
join pricesmart.tb_store_master sm on g.store_id = sm.store_id
GROUP BY 
    g.product_id, g.product_level_id, 
    g.store_id, g.store_level_id, sm.s0_id, sm.s1_id, sm.store_reco_level,
    g.promo_base_price, 
    g.grp
ORDER BY segment_start;

RAISE NOTICE 'Finished processing fn_baseprice_segments';

END;
$function$
;
