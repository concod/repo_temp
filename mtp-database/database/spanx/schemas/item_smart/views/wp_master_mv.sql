--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:wp_master_mv_chg3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment:  initial changeset for wp_master_mv_cgh3
--rollback: SELECT 1
DROP VIEW IF EXISTS item_smart.wp_master_mv;
CREATE OR REPLACE VIEW item_smart.wp_master_mv
AS WITH dept_values AS (
         SELECT DISTINCT product_attributes.attribute_value AS dept
           FROM global.product_attributes
          WHERE product_attributes.attribute_name::text = 'l1_name'::text
        ), channel_values AS (
         SELECT tb_channelmst.name AS channel
           FROM item_smart.tb_channelmst
        ), current_week_values AS (
          SELECT DISTINCT fdm.fiscal_year_week AS current_week,
            fdm.fiscal_year_month
           FROM global.fiscal_date_mapping fdm
           join ( SELECT fdmi.fiscal_year_week - 100 AS min_week,
            fdmi.fiscal_year_week + 200 AS max_week
           FROM global.fiscal_date_mapping fdmi
          WHERE fdmi.calendar_date = CURRENT_DATE) wk_filter 
        ON fdm.fiscal_year_week >= wk_filter.min_week AND fdm.fiscal_year_week <= wk_filter.max_week
        
        )
 SELECT d.dept,
    c.channel,
    cw.current_week
   FROM dept_values d
     CROSS JOIN channel_values c
     CROSS JOIN current_week_values cw;