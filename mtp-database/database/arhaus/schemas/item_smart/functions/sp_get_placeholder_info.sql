--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:sp_get_placeholder_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sp_get_placeholder_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sp_get_placeholder_info();

CREATE OR REPLACE FUNCTION item_smart.sp_get_placeholder_info()
RETURNS TABLE (
    "Placeholder ID" VARCHAR,
    "Placeholder Name" VARCHAR,
    "Placeholder Type" VARCHAR,
    "Department" VARCHAR,
    "Class" VARCHAR,
    "SubClass" VARCHAR,
    "Collection" VARCHAR,
    "Product Type" VARCHAR,
    "Exit Date" DATE,
    "Like Item" VARCHAR,
    "Presentation Min" NUMERIC,
    "FWOS Target" NUMERIC,
    "Launch Date" DATE,
    "AUC" NUMERIC,
    "Vendor" VARCHAR,
    "Initial Markdown Date" DATE,
    "Baseline Discounts" NUMERIC,
    "Lead Time" NUMERIC,
    "Aesthetic" VARCHAR,
    "Color" VARCHAR,
    "Finish" VARCHAR,
    "Form" VARCHAR,
    "Comfort" VARCHAR,
    "Covering" VARCHAR,
    "Function" VARCHAR,
    "Lifestyle" VARCHAR,
    "Shape" VARCHAR,
    "Type" VARCHAR
) 
LANGUAGE plpgsql 
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        pi.product_code::VARCHAR,
        pi.product_name::VARCHAR,
        pi.product_type::VARCHAR,
        pi.l2_name::VARCHAR,
        pi.l3_name::VARCHAR,
        pi.l4_name::VARCHAR,
        pi.collection_name::VARCHAR,
        pi.product_type::VARCHAR,
        pi.exit_date::DATE,
        pi.mapped_product_code::VARCHAR,
        isku.presentation_min::NUMERIC,
        isku.fwos_target::NUMERIC,
        pi.entry_date::DATE,
        isku.auc::NUMERIC,
        isku.vendor_name::VARCHAR,
        isku.markdown_date::DATE,
        isku.baseline_discount::NUMERIC,
        isku.lead_time::NUMERIC,
        (pi.attributes ->> 'aesthetic')::VARCHAR AS "Aesthetic",
        (pi.attributes ->> 'color')::VARCHAR AS "Color",
        (pi.attributes ->> 'finish')::VARCHAR AS "Finish",
        (pi.attributes ->> 'form')::VARCHAR AS "Form",
        (pi.attributes ->> 'comfort')::VARCHAR AS "Comfort",
        (pi.attributes ->> 'covering')::VARCHAR AS "Covering",
        (pi.attributes ->> 'function')::VARCHAR AS "Function",
        (pi.attributes ->> 'lifestyle')::VARCHAR AS "Lifestyle",
        (pi.attributes ->> 'shape')::VARCHAR AS "Shape",
        (pi.attributes ->> 'type')::VARCHAR AS "Type"
    FROM item_smart.placeholders_info pi 
    LEFT JOIN item_smart.itemfact_sku isku
        ON pi.hierarchy_code = isku.hierarchy_code
    WHERE pi.is_cadence_generated IS TRUE;
END;
$$;
