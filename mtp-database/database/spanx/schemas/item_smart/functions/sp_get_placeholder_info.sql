--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:sp_get_placeholder_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_initial_commit
--comment: initial changeset for sp_get_placeholder_info
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.sp_get_placeholder_info();

CREATE OR REPLACE FUNCTION item_smart.sp_get_placeholder_info()
RETURNS TABLE (
    "Style Color ID" VARCHAR,
    "Style Color Name" VARCHAR,
    "Brand" VARCHAR,
    "Category" VARCHAR,
    "SUB_CLASS" VARCHAR,
    "SUPER_STYLE Color" VARCHAR,
    "Attributes" JSONB,
    "Launch Date" DATE,
    "Exit Date" DATE,
    "Like Products" VARCHAR
) 
LANGUAGE plpgsql 
AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        pi.product_code,
        pi.item_description,
        pi.l0_name,
        pi.l1_name,
        pi.l4_name,
        pi.super_style_color_code,
        pi.attributes,
        pi.entry_date,
        pi.exit_date,
        pi.mapped_product_code
    FROM item_smart.placeholders_info pi
    WHERE pi.is_cadence_generated IS TRUE;
END;
$$;