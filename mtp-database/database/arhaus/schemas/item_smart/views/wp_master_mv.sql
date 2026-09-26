--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:wp_master_mv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment:  initial changeset for wp_master_mv 
--rollback: SELECT 1

DROP VIEW IF EXISTS item_smart.wp_master_mv;
CREATE OR REPLACE VIEW item_smart.wp_master_mv
AS WITH dept_values AS (
         SELECT DISTINCT product_attributes.attribute_value AS dept
           FROM global.product_attributes
          WHERE product_attributes.attribute_name::text = 'l2_name'::text
        ), channel_values AS (
         SELECT tb_channelmst.name AS channel
           FROM item_smart.tb_channelmst
        ), current_week_values AS (
         SELECT DISTINCT fiscal_date_mapping.fiscal_year_week AS current_week,
            fiscal_date_mapping.fiscal_year_month
           FROM global.fiscal_date_mapping
        )
 SELECT d.dept,
    c.channel,
    cw.current_week,
    cw.fiscal_year_month
   FROM dept_values d
     CROSS JOIN channel_values c
     CROSS JOIN current_week_values cw;