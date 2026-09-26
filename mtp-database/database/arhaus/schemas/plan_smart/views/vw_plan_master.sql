--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:vw_plan_master_chg1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-58202
--comment:  l3_name added 
--rollback: SELECT 1
DROP VIEW IF EXISTS plan_smart.vw_plan_master;
CREATE OR REPLACE VIEW plan_smart.vw_plan_master
AS SELECT pm.plan_code,
    pm.name,
    pm.plan_period_sdate,
    pm.plan_period_edate,
    pm.created_at,
    pm.updated_at,
    pm.is_deleted,
    pm.channel,
    pm.updated_by,
    pm.created_by,
    pm.compare_year,
    pm.plan_type,
    pm.special_classification,
    pm.planning_level_hierarchy,
    pm.description,
    pm.parent_plan_code,
    pm.scenario_name,
    pm.plan_display_name,
    pm.is_editable,
        CASE
            WHEN plan_attri_pivot.attribute_name_6::integer = ANY (ARRAY[0, 1, 2]) THEN 'pre-season'::text
            WHEN plan_attri_pivot.attribute_name_6::integer <> ALL (ARRAY[0, 1, 2]) THEN 'in-season'::text
            ELSE NULL::text
        END AS plan_type_desc,
    plan_attri_pivot.attribute_name_2 AS l0_name,
    plan_attri_pivot.attribute_name_3 AS l1_name,
    plan_attri_pivot.attribute_name_4 AS l2_name,
    plan_attri_pivot.attribute_name_11 AS l3_name,
    plan_attri_pivot.attribute_name_5 AS weeks,
    plan_attri_pivot.attribute_name_6::integer AS status,
    plan_attri_pivot.attribute_name_7 AS year,
    plan_attri_pivot.attribute_name_8::date AS forecast_upload_date,
    plan_attri_pivot.attribute_name_9 AS season,
    plan_attri_pivot.attribute_name_10 AS channels
   FROM plan_smart.plan_master pm
     JOIN ( SELECT final_result.plan_code,
            final_result.attribute_name_1,
            final_result.attribute_name_2,
            final_result.attribute_name_3,
            final_result.attribute_name_4,
            final_result.attribute_name_5,
            final_result.attribute_name_6,
            final_result.attribute_name_7,
            final_result.attribute_name_8,
            final_result.attribute_name_9,
            final_result.attribute_name_10,
            final_result.attribute_name_11
           FROM crosstab('select plan_code, attribute_name, attribute_value
        from plan_smart.plan_attributes
        order by 1,2
        '::text, 'SELECT ''plan_code'' union all
          SELECT ''l0_name'' union all
          SELECT ''l1_name'' union all
          SELECT ''l2_name'' union all
          select ''weeks'' union all
          select ''status'' union all
          select ''plansmart_year_value'' union all
          select ''forecast_upload_date'' union all
          select ''season'' union all
		  select ''channels'' union all
          SELECT ''l3_name''
        '::text) final_result(plan_code integer, attribute_name_1 text, attribute_name_2 text, attribute_name_3 text, attribute_name_4 text, attribute_name_5 text, attribute_name_6 text, attribute_name_7 text, attribute_name_8 text, attribute_name_9 text, attribute_name_10 text, attribute_name_11 text)) plan_attri_pivot ON pm.plan_code = plan_attri_pivot.plan_code;
