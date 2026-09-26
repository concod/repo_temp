--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_calculate_product_store_costs_10 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_calculate_product_store_costs_10

DROP FUNCTION IF EXISTS base_pricing.fn_calculate_product_store_costs;

CREATE OR REPLACE FUNCTION base_pricing.fn_calculate_product_store_costs(p_product_ids bigint[] DEFAULT NULL::bigint[], p_cost_types text[] DEFAULT ARRAY['base_cost'::text, 'rebate'::text, 'shipping_cost'::text])
 RETURNS TABLE(product_id bigint, store_id integer, channel_id smallint, cost_components jsonb, additional_cost numeric, total_cost numeric)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- If no specific product IDs provided, get all from mapping
    IF p_product_ids IS NULL THEN
        SELECT array_agg(DISTINCT product_id)
        INTO p_product_ids
        FROM base_pricing.bp_product_attributes_mapping;
    END IF;

    RETURN QUERY
    WITH product_attrs AS (
        SELECT 
            pam.product_id,
            jsonb_object_agg(
                attr->>'attribute_name', 
                (attr->'attribute_value'->>'current')::numeric
            ) as attribute_values
        FROM base_pricing.bp_product_attributes_mapping pam,
        LATERAL jsonb_array_elements(pam.attributes) AS attr
        WHERE pam.product_id = ANY(p_product_ids)
        AND (attr->>'attribute_name') = ANY(p_cost_types)
        GROUP BY pam.product_id
    ),
    product_store_attrs AS (
        SELECT 
            psam.product_id,
            psam.store_id,
            psam.channel_id,
            COALESCE(pa.attribute_values, '{}'::jsonb) as product_attributes,
            jsonb_build_object(
                'total_cost', COALESCE(psam.attribute_3, 0),
                    'additional_cost', COALESCE(psam.attribute_2, 0)
            ) as store_attributes
        FROM base_pricing.bp_product_store_attributes_mapping_v4 psam
        LEFT JOIN product_attrs pa ON psam.product_id = pa.product_id
        WHERE psam.product_id = ANY(p_product_ids)
    ),
    cost_calculations AS (
        SELECT 
            psa.product_id,
            psa.store_id,
            psa.channel_id,
            bcclc.cost_formula,
            jsonb_object_agg(
                cost_type,
                COALESCE(
                    (psa.product_attributes->>cost_type)::numeric,
                    (psa.store_attributes->>cost_type)::numeric,
                    0
                )
            ) as cost_components
        FROM product_store_attrs psa
        CROSS JOIN unnest(p_cost_types) as cost_type
        LEFT JOIN base_pricing.bp_channel_cost_logic_config bcclc 
            ON psa.channel_id = bcclc.channel_id
        GROUP BY psa.product_id, psa.store_id, psa.channel_id, bcclc.cost_formula
    )
    SELECT 
        cc.product_id,
        cc.store_id,
        cc.channel_id,
        cc.cost_components,
        CASE 
            WHEN cc.cost_formula->>'additional_cost' IS NOT NULL THEN
                base_pricing.fn_evaluate_cost_formula(
                    cc.cost_formula->>'additional_cost',
                    cc.cost_components
                )
            ELSE 0
        END as additional_cost,
        CASE 
            WHEN cc.cost_formula->>'total_cost' IS NOT NULL THEN
                base_pricing.fn_evaluate_cost_formula(
                    cc.cost_formula->>'total_cost',
                    cc.cost_components
                )
            ELSE COALESCE((cc.cost_components->>'base_cost')::numeric, 0)
        END as total_cost
    FROM cost_calculations cc;
END;
$function$
;