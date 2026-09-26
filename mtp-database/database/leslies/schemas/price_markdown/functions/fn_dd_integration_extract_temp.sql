--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_dd_integration_extract_temp_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_dd_integration_extract_temp_2
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_dd_integration_extract_temp;
CREATE OR REPLACE FUNCTION price_markdown.fn_dd_integration_extract_temp(_sid integer)
 RETURNS TABLE("Dept #" integer, "Class #" integer, "Class Name" character varying, "Merch Cat #" integer, "Merch Cat Name" character varying, "Article #" integer, "Article Description" character varying, "Old Price" numeric, "New Price" numeric, "Discount %" numeric, "Start Date" date, "End Date" date, "Location Number" integer, "TEMP" character varying)
	LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    WITH ending_rule AS (
        SELECT strategy_id, unnest(applicable_value) AS end_rule
        FROM price_markdown.tb_strategy_rule t1
        INNER JOIN (
            SELECT rule_id, rule_type
            FROM price_markdown.tb_rule_master trm
        ) t2 ON t1.constraint_id = t2.rule_id
        WHERE constraint_type = 0
            AND status = 0
            AND rule_type = 44 -- Ending_Rule
            AND strategy_id = _sid
        GROUP BY 1, 2
    ),

    upcoming_pcd_date AS (
    SELECT
        min(pcd_start_date) AS future_pcd_date
    FROM
        price_markdown.tb_strategy_pcd
    WHERE
        strategy_id = _sid
    AND pcd_start_date > date(timezone('US/Eastern', now()))
        ),

    strategies AS (
        SELECT
            tsp.strategy_id,
            tsdf.markdown_percentage,
            tsdf.product_level_id,
            tsdf.store_level_id,
            markdown_percentage / 100 AS discount,
            MIN(pcd_start_date) AS start_dt,
            MAX(pcd_end_date)  AS end_dt

        FROM
            (
             SELECT strategy_id, pcd_id, pcd_start_date, pcd_end_date
             FROM price_markdown.tb_strategy_pcd
             WHERE strategy_id = _sid
             ) tsp
        LEFT JOIN
            ending_rule er ON tsp.strategy_id = er.strategy_id
        JOIN price_markdown.tb_strategy_discount_finalized tsdf
        ON tsp.strategy_id = tsdf.strategy_id AND tsp.pcd_id = tsdf.pcd_id
        WHERE er.end_rule IS NULL
        GROUP BY 1,2,3,4,5
        HAVING MAX(pcd_end_date)  >= (SELECT future_pcd_date FROM upcoming_pcd_date)
    ),
    strategies_rank AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY product_level_id, store_level_id ORDER BY end_dt) AS row_num
        FROM strategies
    ),
    sssm_filtered AS (
        SELECT strategy_id, product_id, store_h6_id, product_level_id, store_level_id
        FROM price_markdown.tb_strategy_sku_store_mapping
        WHERE strategy_id = _sid
    ),
    strategy_sku AS (
        SELECT b.*, a.product_id, a.store_h6_id, a.product_level_id, a.store_level_id
        FROM strategies_rank b
        JOIN sssm_filtered a ON b.strategy_id = a.strategy_id
        AND b.product_level_id = a.product_level_id
        AND b.store_level_id = a.store_level_id
        WHERE b.row_num <= 2
    ),
    pm_details AS (
        SELECT ss.*, pm.product_name, pm.product_h4_name as Merch_Cat_Name, pm.client_subclassid as Merch_Cat_Id,
		pm.client_classid as Class_Id, pm.product_h3_name as Class_Name, pm.product_h2_id as Dept_Id, pm.price as old_price
        FROM strategy_sku ss
        JOIN (
            SELECT
            product_id,
            product_h5_name_orignal AS product_name,
            product_h4_name_orignal AS product_h4_name,
            client_subclassid,
            client_classid,
            product_h3_name_orignal AS product_h3_name,
            product_h2_id,
            price
            FROM price_markdown.tb_product_master_mkd_v1
        ) pm ON ss.product_id = pm.product_id
    )
     SELECT
        dept_id,
        class_id,
        class_name::character varying ,
        merch_cat_id,
        merch_cat_name::character varying,
        product_id,
        product_name::character varying,
        old_price::numeric,
        round((old_price * (1 - discount))::numeric,2) AS new_price,
        discount::numeric,
        start_dt as start_date, end_dt as end_date,
		store_h6_id as location_number,
		'TEMP'::character varying as "TEMP"
    FROM pm_details;

END;
$function$
;