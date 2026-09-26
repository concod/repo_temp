--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:wp_master_mv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment:  initial changeset for wp_mster_mv
--rollback: SELECT 1
DROP VIEW IF EXISTS item_smart.wp_master_mv;
CREATE OR REPLACE VIEW item_smart.wp_master_mv AS 
SELECT 
    tc.name AS country,
    cm.name AS channel,
    fdm.fiscal_year_week AS current_week,
    fdm.fiscal_year_month  as fiscal_year_month
FROM item_smart.tb_countrymst tc
JOIN item_smart.tb_channelmst cm ON 1 = 1
JOIN global.fiscal_date_mapping fdm ON 1 = 1
JOIN (
    with t1 as(
select distinct fiscal_year_month,
dense_rank() over( order by fiscal_year_month) as month_row
from global.fiscal_date_mapping
where calendar_date >= CURRENT_DATE - INTERVAL '12 months'
order by 2
)

select min(fiscal_year_week) min_week, max(fiscal_year_week) as max_week
from global.fiscal_date_mapping
join t1 using(fiscal_year_month)
where month_row <=38
) wk_filter 
ON fdm.fiscal_year_week >= wk_filter.min_week 
AND fdm.fiscal_year_week <= wk_filter.max_week
group by country, channel, current_week, fiscal_year_month;

