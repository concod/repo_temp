--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:wp_master_mv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:001
--comment: added wp_master_mv
--rollback: SELECT 1
DROP VIEW IF EXISTS item_smart.wp_master_mv;
CREATE OR REPLACE VIEW item_smart.wp_master_mv AS
WITH dept_values AS (
    SELECT DISTINCT attribute_value AS dept
    FROM global.product_attributes
    WHERE attribute_name = 'l1_name'
),
channel_values AS (
    SELECT name AS channel
    FROM item_smart.tb_channelmst
),
current_week_values AS (
    SELECT DISTINCT fdm.fiscal_year_week AS current_week,
                    fdm.fiscal_year_month
    FROM global.fiscal_date_mapping fdm
    JOIN (
        SELECT fiscal_year_week - 100 AS min_week,
               fiscal_year_week + 200 AS max_week
        FROM global.fiscal_date_mapping
        WHERE calendar_date = CURRENT_DATE
    ) wk_filter
    ON fdm.fiscal_year_week BETWEEN wk_filter.min_week AND wk_filter.max_week
),
active_depts AS (
    SELECT DISTINCT l1_name AS dept
    FROM item_smart.mv_product_hierarchies_filter
)
SELECT d.dept,
       c.channel,
       cw.current_week,
       cw.fiscal_year_month,
       CASE WHEN ad.dept IS NOT NULL THEN 1 ELSE 0 END AS is_active
FROM dept_values d
CROSS JOIN channel_values c
CROSS JOIN current_week_values cw
LEFT JOIN active_depts ad ON d.dept = ad.dept;