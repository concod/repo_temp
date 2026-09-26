--liquibase formatted sql
--changeset shreyansh.pathak@impactanalytics.co:sp_get_itemfact_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sp_get_itemfact_report
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sp_get_itemfact_report();

CREATE OR REPLACE FUNCTION item_smart.sp_get_itemfact_report()
RETURNS TABLE(
    "Product" character varying,
    "Itemfact" text,
    "Start_Date" date,
    "End_Date" date,
    "IA_value" text,
    "Arhaus_value" text
)
LANGUAGE plpgsql
AS $function$
BEGIN
RETURN QUERY
-- First query: Static itemfact comparisons 
WITH static_comparison AS (
    SELECT
        mv.product_code as Product,
        comparison.itemfact as Itemfact,
        CURRENT_DATE AS Start_Date,
        null::Date as End_Date,
        comparison.IA_value as IA_value,
        comparison.arhaus_value as Arhaus_value
    FROM item_smart.itemfact_sku IFS 
    CROSS JOIN LATERAL (
        VALUES
            ('AUC', CAST(auc_feed AS TEXT), CAST(auc AS TEXT)),
            ('MOQ', CAST(moq_feed AS TEXT), CAST(moq AS TEXT)),
            ('LAUNCH_DATE', CAST(launch_date_feed AS TEXT), CAST(launch_date AS TEXT)),
            ('MARKDOWN_DATE', CAST(markdown_date_feed AS TEXT), CAST(markdown_date AS TEXT)),
            ('VENDOR_NAME', CAST(vendor_name_feed AS TEXT), CAST(vendor_name AS TEXT)),
            ('EXIT_DATE', CAST(exit_date_feed AS TEXT), CAST(exit_date AS TEXT)),
            ('NO_OF_REG_WEEKS', CAST(no_of_reg_weeks_feed AS TEXT), CAST(no_of_reg_weeks AS TEXT)),
            ('LEAD_TIME', CAST(lead_time_feed AS TEXT), CAST(lead_time AS TEXT)),
            ('BASELINE_DISCOUNT', CAST(baseline_discount_feed AS TEXT), CAST(baseline_discount AS TEXT)),
            ('PRESENTATION_MIN', CAST(presentation_min_feed AS TEXT), CAST(presentation_min AS TEXT)),
            ('FWOS_TARGET', CAST(fwos_target_feed AS TEXT), CAST(fwos_target AS TEXT)),
            ('AOH_FLAG', CAST(aoh_flag_feed AS TEXT), CAST(aoh_flag AS TEXT))
        ) AS comparison(itemfact, IA_value, arhaus_value)
    JOIN (
        SELECT hierarchy_code, product_code 
        FROM item_smart.mv_product_hierarchies_filter
    ) mv ON IFS.hierarchy_code = mv.hierarchy_code
    WHERE comparison.IA_value != comparison.arhaus_value
),

-- Second query: Weekly data comparisons
store_tier AS (
    SELECT 
        hierarchy_code,
        current_week,
        'AssortmentTier_StoreCount' as itemfact,
        tier_store_count::text as arhaus_value,
        tier_store_count_feed::text as IA_value
    FROM item_smart.itemfact_sku_week
    WHERE tier_store_count::jsonb != tier_store_count_feed::jsonb
),

air_data AS (
    SELECT 
        hierarchy_code,
        current_week,
        'AIR' as itemfact,
        air::text as arhaus_value,
        air_feed::text as IA_value
    FROM item_smart.itemfact_sku_week
    WHERE air::float8 != air_feed::float8
),

final_tbl AS (
    SELECT 
        hierarchy_code,
        current_week,
        itemfact,
        arhaus_value,
        IA_value 
    FROM store_tier 
    
    UNION ALL
    
    SELECT 
        hierarchy_code,
        current_week,
        itemfact,
        arhaus_value,
        IA_value 
    FROM air_data
),

weekly_comparison AS (
    SELECT 
        mv.product_code as Product,
        ft.itemfact as Itemfact,
        fdm.start_date as Start_Date,
        fdm.end_date as End_Date,
        ft.IA_value as IA_value,
        ft.arhaus_value as Arhaus_value
    FROM final_tbl ft 
    JOIN (
        SELECT hierarchy_code, product_code
        FROM item_smart.mv_product_hierarchies_filter
        GROUP BY 1,2
    ) mv ON ft.hierarchy_code = mv.hierarchy_code
    JOIN (
        SELECT 
            fiscal_year_week as current_week, 
            min(calendar_date) as start_date, 
            max(calendar_date) as end_date
        FROM "global".fiscal_date_mapping
        GROUP BY 1
    ) fdm USING(current_week)
)

-- Combine both result sets
SELECT * FROM static_comparison
UNION ALL
SELECT * FROM weekly_comparison
ORDER BY Product, Itemfact, Start_Date;

END;
$function$;