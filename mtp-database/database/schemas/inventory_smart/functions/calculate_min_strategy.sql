--liquibase formatted sql
--changeset srinivasgowda.sg@impactanalytics:calculate_min_strategy runOnChange:true stripComments:false splitStatements:false context:as_1 labels:calculate_min_strategy_1
--comment: calculate_min_strategy
--rollback: SELECT  1

DROP FUNCTION IF EXISTS inventory_smart.calculate_min_strategy(text, text);

CREATE OR REPLACE FUNCTION inventory_smart.calculate_min_strategy(p_configuration_mapping_table text, p_constraints_resolved_table text)
 RETURNS TABLE(article text, product_code text, store_code text, wos real, min_stock real, max_stock real, aps real, min_distribution character varying, st real)
 LANGUAGE plpgsql
AS $function$
DECLARE
    sql_query TEXT;
BEGIN
   -- Step 0: Drop temp tables if they exist

    DROP TABLE IF EXISTS temp_config_data;
    DROP TABLE IF EXISTS temp_main_data;
    DROP TABLE IF EXISTS temp_normalized_proportion;
    DROP TABLE IF EXISTS equal_dist;
    DROP TABLE IF EXISTS pp_dist;
    DROP TABLE IF EXISTS x_unit_dist;

    -- Step 1: Create temp table with unnested configuration data
    sql_query := format('
        CREATE TEMP TABLE temp_config_data ON COMMIT DROP AS
        WITH unnested_config AS (
            SELECT 
                x.*,
                UNNEST(x.product_codes) AS product_code
            FROM %s x
        )
        SELECT 
            y.product_code,y.store_code,y.aps,y.wos,y.min_stock,y.max_stock,y.min_distribution,y.st, uc.article, uc.default_product_profile
        FROM unnested_config uc
        JOIN %s y 
            ON y.product_code = uc.product_code',
        p_configuration_mapping_table,
        p_constraints_resolved_table
    );
raise notice 'sql_query: %', sql_query;
    EXECUTE sql_query;
    -- Step 2: Create main_data temp table with combined logic
    sql_query := format('
    CREATE TEMP TABLE temp_main_data ON COMMIT DROP AS
     SELECT * FROM (
    WITH size_counts AS materialized (
        SELECT paf.article, COUNT(DISTINCT paf."size") AS size_count
        FROM global.product_attributes_filter paf
        JOIN temp_config_data tcd ON paf.article = tcd.article
        WHERE paf.active AND tcd.default_product_profile IS NULL
        GROUP BY paf.article
    )
    SELECT 
        sc.wos,
        sc.min_stock,
        sc.max_stock,
        sc.aps,
        sc.min_distribution,
        sc.st,
        saf.store_code::text,
        saf.store_name::text,
        saf.channel::text,
        paf.article::text,
        paf.product_code::text,
        COALESCE(ppm.overall_proportion, 0) AS overall_proportion,
        COALESCE(ppm.size_level_proportion, 0) AS size_level_proportion,
        paf."size"::text,
        cs.size_count,
        ast."order"
    FROM temp_config_data sc
    JOIN global.product_attributes_filter paf 
        ON paf.product_code = sc.product_code
    JOIN global.store_attributes_filter saf 
        ON saf.store_code = sc.store_code
    JOIN size_counts cs 
        ON cs.article = paf.article
    LEFT JOIN inventory_smart.product_profile_mapping ppm
        ON ppm.product_code = sc.product_code 
        AND ppm.store_code = sc.store_code
    LEFT JOIN inventory_smart.article_status_tag ast 
        ON ast.product_code = sc.product_code
    WHERE sc.default_product_profile IS NULL
    GROUP BY 
        sc.wos,
        sc.min_stock,
        sc.max_stock,
        sc.aps,
        sc.min_distribution,
        sc.st,
        saf.store_code,
        saf.store_name,
        saf.channel,
        paf.article,
        paf.product_code,
        paf."size",
        ppm.overall_proportion,
        ppm.size_level_proportion,
        cs.size_count,
        ast."order"
) first_query

UNION ALL

SELECT * FROM (
    WITH sizes AS (
        SELECT product_code, size 
        FROM global.product_attributes_filter 
    ),
    size_counts AS materialized (
        SELECT 
            paf.article, 
            COUNT(DISTINCT paf."size") AS size_count
        FROM global.product_attributes_filter paf
        JOIN temp_config_data tcd ON paf.article = tcd.article
        WHERE paf.active AND tcd.default_product_profile IS NOT NULL
        GROUP BY paf.article
    )
    SELECT 
        sc.wos,
        sc.min_stock,
        sc.max_stock,
        sc.aps,
        sc.min_distribution,
        sc.st,
        saf.store_code::text,
        saf.store_name::text,
        saf.channel::text,
        sc.article::text,
        sc.product_code::text,
        COALESCE(ppums.overall_proportion, 0) AS overall_proportion,
        COALESCE(ppums.size_level_proportion, 0) AS size_level_proportion,
        s."size"::text,
        sc2.size_count,
        ast."order"
    FROM temp_config_data sc
    JOIN global.store_attributes_filter saf 
        ON saf.store_code = sc.store_code
    JOIN sizes s 
        ON s.product_code = sc.product_code 
    JOIN size_counts sc2 
        ON sc2.article = sc.article
    JOIN global.product_attributes_filter paf 
        ON paf.product_code = sc.product_code 
        AND paf.size = s.size
    JOIN inventory_smart.ph_master ph 
        ON ph.article = paf.article 
        AND s.size = ANY(ph.sizes)
    JOIN %s pcm 
        ON pcm.ph_code = ph.ph_code
    JOIN inventory_smart.product_profile_master ppm
        ON ppm.pp_code = pcm.default_product_profile
    LEFT JOIN inventory_smart.product_profile_user_mapping_size ppums
        ON ppums.pp_code = pcm.default_product_profile 
        AND ppums.size = s.size
        AND ppums.store_code = sc.store_code
    LEFT JOIN inventory_smart.article_status_tag ast 
        ON ast.product_code = sc.product_code
    WHERE sc.default_product_profile IS NOT NULL
) second_query;
',
        p_configuration_mapping_table
    );
raise notice 'sql_query: %', sql_query;
    EXECUTE sql_query;

    CREATE TEMP TABLE temp_normalized_proportion ON COMMIT DROP AS
		WITH active_data AS (
		    SELECT 
		        t.store_code,
		        t.store_name,
		        t.article,
		        t.size,
		        COALESCE(t.size_level_proportion, 0) AS size_level_proportion,
		        t."order"
		    FROM temp_main_data t
		    WHERE t.size_level_proportion IS NOT NULL
		),
		summed AS (
			    SELECT 
			        ad.*,
			        SUM(ad.size_level_proportion) 
			        OVER (PARTITION BY ad.store_code, ad.article) AS store_sum
			    FROM active_data ad
			),
		rescaled AS (
		    SELECT *,
		           CASE 
		               WHEN sm.store_sum = 0 THEN 0
		               ELSE sm.size_level_proportion / sm.store_sum
		           END AS normalized_proportion
		    FROM summed sm
		)
		SELECT
		    rs.store_code,
		    rs.store_name,
		    rs.article,
		    rs.size,
		    rs.size_level_proportion,
		    ROUND(rs.normalized_proportion::numeric * 100, 2) AS normalized_proportion,
		    rs."order"
		FROM rescaled rs
		ORDER BY rs.store_code, rs.article, rs."order";

create temp table equal_dist ON COMMIT DROP as 
 WITH expanded AS (
		        SELECT 
		            t.store_code,
		            t.size, t.min_stock,
		            tn.normalized_proportion AS profile_val,
		            t.product_code,
		            t.article,
                    t.order
		        FROM temp_main_data t
                JOIN temp_normalized_proportion tn
				  ON tn.store_code = t.store_code
				 AND tn.article = t.article
				 AND tn.size = t.size 
		        where (t.min_distribution::jsonb ->> 'distribution_type') = 'equal_distribute'
		        -- group by t.store_code,
		        --      t.size,t.min_stock,
		        --     t.size_level_proportion,t.product_code,t.article,
                --     t.order
		    )
		    ,
		    size_count AS (
		        SELECT e.article,e.store_code, COUNT(distinct size) AS cnt
		        FROM expanded e
		        GROUP BY e.store_code, e.article
		    )
		    ,
		    base_alloc AS (
		        SELECT 
		            e.store_code,
		            e.size,
		            e.profile_val,
		            floor(e.min_stock::numeric / sc.cnt)::int AS base_units,
		            (e.min_stock::numeric % sc.cnt) AS leftover_per_store,
		            e.product_code,
		            e.article,
                    e.order
		        FROM expanded e
		        JOIN size_count sc on e.store_code = sc.store_code and e.article = sc.article
		    )
		    ,
		    distribute AS (
		        SELECT
		            b.*,
		            ROW_NUMBER() OVER (PARTITION BY b.store_code, b.article ORDER BY b.profile_val DESC, b.order) AS rn
		        FROM base_alloc b
		    )
		        SELECT
		            d.store_code,
		            d.size,
		            d.base_units +
		                CASE WHEN d.rn <= d.leftover_per_store THEN 1 ELSE 0 END AS final_min,
		            d.product_code 
		        FROM distribute d;

create temp table pp_dist ON COMMIT DROP as
WITH expanded AS (
                SELECT 
                    t.store_code,
                    t.store_name,
                    t.size, t.min_stock,
                    tn.normalized_proportion AS profile_val,
		            t.product_code,
		            t.article,
                    t.order
                FROM temp_main_data t
                JOIN temp_normalized_proportion tn
				  ON tn.store_code = t.store_code
				 AND tn.article = t.article
				 AND tn.size = t.size
		       where (t.min_distribution::jsonb ->> 'distribution_type') = 'product_profile'
            )
            ,
            size_count AS (
                SELECT e.store_code, e.article, COUNT(distinct size) AS cnt
                FROM expanded e
                GROUP BY e.store_code, e.article
            )
            ,
            profile_sum AS (
                SELECT e.store_code, e.article, SUM(profile_val) AS total_profile
                FROM expanded e
                GROUP BY e.store_code, e.article
            )
            ,
            base_calc AS (
                SELECT
                    e.store_code,
                    e.store_name,
                    e.size,
                    e.profile_val,
                    sc.cnt,
                    e.min_stock,
                    ps.total_profile,
                    CASE 
                        WHEN ps.total_profile = 0 THEN           -- all zero proportions → equal distribution
                            e.min_stock / sc.cnt
                        ELSE
                            (e.min_stock * e.profile_val / ps.total_profile)
                    END AS raw_min,
		            e.product_code,
		            e.article,
                    e.order
                FROM expanded e
                JOIN size_count sc on e.store_code = sc.store_code and e.article = sc.article
                JOIN profile_sum ps on e.store_code = ps.store_code and e.article = ps.article
            )
            ,
            floored AS (
                SELECT 
                    b.store_code,
                    b.store_name,
                    b.size,
                    b.min_stock,
                    floor(b.raw_min)::int AS floored_min,
                    (b.raw_min - floor(b.raw_min)) AS remainder,
		            b.product_code,
		            b.article,
                    b.order
                FROM base_calc b
            )
            ,
            distribute AS (
                SELECT 
                    f.*,
                    ROW_NUMBER() OVER (PARTITION BY f.store_code, f.article ORDER BY f.remainder DESC, f.order) AS rn,
                    SUM(floored_min) OVER (PARTITION BY f.store_code, f.article) AS total_floored
                FROM floored f
            )
                SELECT
                    d.store_code,
                    d.store_name,
                    d.size,
                    d.floored_min +
                        CASE 
                            WHEN d.rn <= (d.min_stock - d.total_floored) THEN 1 ELSE 0
                        END AS final_min,
		            d.product_code
                FROM distribute d ;

create temp table x_unit_dist ON COMMIT DROP as
        with fixed1 as (
                SELECT t.article,
                    key AS size,
                    (value::int) AS fixed_units
                FROM temp_main_data t
              CROSS JOIN LATERAL jsonb_each((t.min_distribution::jsonb)->'x_units_per_size') AS kv(key, value)
              WHERE (t.min_distribution::jsonb ->> 'distribution_type') = 'x_units_per_size'
              group by key,value, t.article
              )
              ,
              fixed as (
                SELECT f.article, SUM(fixed_units) as fixed_units  FROM fixed1 f group by f.article
              ),
              expanded AS (
                    SELECT 
                    t.store_code,
                    t.store_name,
                    kv.key AS size,
                    kv.value::int AS fixed_units,
                    t.min_stock,
                    tn.normalized_proportion AS profile_val,
		            paf.product_code,
		            t.article,
                    t.order
              FROM temp_main_data t
              CROSS JOIN LATERAL jsonb_each((t.min_distribution::jsonb)->'x_units_per_size') AS kv(key, value)
              JOIN global.product_attributes_filter paf 
              ON paf.product_code = t.product_code AND kv.key = paf.size 
              JOIN temp_normalized_proportion tn
			  ON tn.store_code = t.store_code
			  AND tn.article = t.article
			  AND tn.size = t.size
              WHERE (t.min_distribution::jsonb ->> 'distribution_type') = 'x_units_per_size'
            )
            ,
            store_stats AS (
                SELECT 
                    e.store_code,
                    COUNT(*) AS cnt,
                    SUM(profile_val) AS total_profile,
                    e.article
                FROM expanded e
                GROUP BY e.store_code,e.article
            )
            ,
            base_calc AS (
                SELECT
                    e.store_code,
                    e.store_name,
                    e.size,
                    e.fixed_units,
                    s.cnt,
                    s.total_profile,
                    e.min_stock,
                    CASE 
                        WHEN s.total_profile = 0 THEN
                            greatest((e.min_stock - f.fixed_units), 0)::numeric / s.cnt
                        ELSE
                            (e.profile_val / s.total_profile) * 
                            greatest((e.min_stock - f.fixed_units), 0)
                    END AS raw_extra,
		            e.product_code,
		            e.article,
                    e.order
                FROM expanded e
                JOIN store_stats s USING (store_code, article)
                join fixed f using(article)
            )
            ,
            floored AS (
                SELECT 
                    b.store_code,
                    b.store_name,
                    b.size,
                    b.fixed_units,
                    b.min_stock,
                    floor(b.raw_extra)::int AS floored_extra,
                    (b.raw_extra - floor(raw_extra)) AS remainder,
		            b.product_code,
		            b.article,
                    b.order
                FROM base_calc b
            )
            ,
            distribute AS (
                SELECT
                    f.*,
                    ROW_NUMBER() OVER (PARTITION BY f.store_code,f.article ORDER BY f.remainder DESC, f.order) AS rn,
                    SUM(f.floored_extra) OVER (PARTITION BY f.store_code,f.article) AS total_floored
                FROM floored f
            )
                SELECT
                    d.store_code,
                    d.store_name,
                    d.size,
                    d.fixed_units + d.floored_extra +
                        CASE 
                            WHEN d.rn <= (d.min_stock - (f.fixed_units) - total_floored) 
                            THEN 1 ELSE 0 
                        END AS final_min,
		            d.product_code
                FROM distribute d
                join fixed f using(article);
                
    -- Step 3: Return final results with calculated min_stock
    RETURN QUERY
    SELECT 
        t.article::TEXT,
        t.product_code::TEXT,
        t.store_code::TEXT,
        t.wos::REAL,
        CASE 
            WHEN t.min_distribution IS NOT NULL THEN
                CASE 
                    WHEN (t.min_distribution::jsonb ->> 'distribution_type') = 'same_min' THEN
                        t.min_stock::REAL
                    WHEN (t.min_distribution::jsonb ->> 'distribution_type') = 'equal_distribute' THEN
                        ed.final_min 
                    WHEN (t.min_distribution::jsonb ->> 'distribution_type') = 'product_profile' THEN
                        pd.final_min 
                    WHEN (t.min_distribution::jsonb ->> 'distribution_type') = 'x_units_per_size' THEN
                       xd.final_min 
                    WHEN t.min_distribution IS NULL THEN 
                         t.min_stock::REAL
                    ELSE t.min_stock::REAL
                END
            ELSE t.min_stock::REAL
        END AS min_stock,
        t.max_stock::REAL,
        t.aps::REAL,
        CASE 
            WHEN t.min_distribution IS NOT NULL THEN 
                t.min_distribution::VARCHAR
            ELSE 
                'same_min'::VARCHAR
        END AS min_distribution,
        t.st::REAL
    FROM temp_main_data t
LEFT JOIN equal_dist ed 
    ON ed.store_code = t.store_code AND ed.product_code = t.product_code
LEFT JOIN pp_dist pd 
    ON pd.store_code = t.store_code AND pd.product_code = t.product_code
LEFT JOIN x_unit_dist xd 
    ON xd.store_code = t.store_code AND xd.product_code = t.product_code
    ORDER BY t.article, t.product_code, t.store_code;
    -- Clean up temp tables
    DROP TABLE IF EXISTS temp_config_data;
    DROP TABLE IF EXISTS temp_main_data;
    DROP TABLE IF EXISTS equal_dist;
    DROP TABLE IF EXISTS pp_dist;
    DROP TABLE IF EXISTS x_unit_dist;
    
END;
$function$
;