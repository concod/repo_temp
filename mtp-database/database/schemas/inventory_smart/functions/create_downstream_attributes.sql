--liquibase formatted sql
--changeset aniruddh.singh@impactanalytics.co:create_downstream_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sm_create_downstream_attributes
--comment: initial changeset for create_downstream_attributes
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.create_downstream_attributes(input jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.create_downstream_attributes(input jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    v_items jsonb;
    v_item jsonb;
    v_typeof text;

    v_allocation_code text;
    v_type text;
    v_auto_finalized boolean;
    v_auto_released boolean;
    v_auto_finalized_txt text;
    v_auto_released_txt text;

    v_attr jsonb;
    v_attribute_code text;
    v_attribute_name text;
BEGIN
    IF input IS NULL THEN
        RAISE EXCEPTION 'input cannot be null';
    END IF;

    v_typeof := jsonb_typeof(input);
    IF v_typeof = 'object' THEN
        v_items := jsonb_build_array(input);
    ELSIF v_typeof = 'array' THEN
        v_items := input;
    ELSE
        RAISE EXCEPTION 'input must be a JSON object or an array of JSON objects (got %).', v_typeof;
    END IF;

    FOR v_item IN SELECT jsonb_array_elements(v_items)
    LOOP
        -- Required
        v_allocation_code := v_item->>'allocation_code';
        IF v_allocation_code IS NULL OR v_allocation_code = '' THEN
            RAISE EXCEPTION 'allocation_code is required';
        END IF;

        -- Optional with defaults (safe boolean parsing)
        v_type := COALESCE(v_item->>'type', 'auto');
        v_auto_finalized_txt := lower(NULLIF(v_item->>'auto_finalized', ''));
        IF v_auto_finalized_txt IS NULL OR v_auto_finalized_txt NOT IN ('true','false','t','f','1','0','yes','no','on','off') THEN
            v_auto_finalized := false;
        ELSE
            v_auto_finalized := v_auto_finalized_txt::boolean;
        END IF;

        v_auto_released_txt := lower(NULLIF(v_item->>'auto_released', ''));
        IF v_auto_released_txt IS NULL OR v_auto_released_txt NOT IN ('true','false','t','f','1','0','yes','no','on','off') THEN
            v_auto_released := false;
        ELSE
            v_auto_released := v_auto_released_txt::boolean;
        END IF;

        -- Attributes array - bulk upsert
        INSERT INTO inventory_smart.downstream_files_attributes (
            allocation_code,
            attribute_name,
            attribute_code,
            auto_finalized,
            auto_released,
            type
        )
        SELECT
            v_allocation_code,
            attrs->>'attribute_name',
            attrs->>'attribute_code',
            v_auto_finalized,
            v_auto_released,
            v_type
        FROM jsonb_array_elements(COALESCE(v_item->'attributes', '[]'::jsonb)) AS attrs
        WHERE (attrs->>'attribute_code') IS NOT NULL
          AND (attrs->>'attribute_code') <> ''
        ON CONFLICT (allocation_code, attribute_code) DO UPDATE SET
            attribute_name = EXCLUDED.attribute_name,
            auto_finalized = EXCLUDED.auto_finalized,
            auto_released  = EXCLUDED.auto_released,
            type           = EXCLUDED.type;
    END LOOP;

    -- timestamp handled by column default or application; not set here
    RETURN;
END
$function$;