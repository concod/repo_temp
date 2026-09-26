--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_update_competitor_attributes_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_update_competitor_attributes_10

DROP PROCEDURE IF EXISTS base_pricing.sp_update_competitor_attributes;

CREATE OR REPLACE PROCEDURE base_pricing.sp_update_competitor_attributes()
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _sql    text;
BEGIN
    -- Build dynamic SQL for competitor_attributes update
    _sql := $$
        UPDATE base_pricing.bp_product_store_attributes_mapping AS mapping
        SET competitor_attributes = (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'attribute_name', meta.attribute_name,   
                    'attribute_value', jsonb_build_object(
                        'current', comp.comp_base_price,
                        'initial', comp.comp_base_price
                    )
                )
            )
            FROM base_pricing.bp_competitor_attributes_metadata AS meta
            LEFT JOIN base_pricing.bp_competitor_attributes AS comp
              ON meta.attribute_name = LOWER(TRIM(comp.competitor))  
             AND comp.product_id = mapping.product_id
             AND comp.store_id  = mapping.store_id
            WHERE meta.is_active = true
        )
        WHERE mapping.segment_id = 10001;
    $$;

    EXECUTE _sql;
END;
$procedure$
;