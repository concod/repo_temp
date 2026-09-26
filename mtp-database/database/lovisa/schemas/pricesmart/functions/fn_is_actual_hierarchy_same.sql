--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_is_actual_hierarchy_same_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_is_actual_hierarchy_same_1

DROP FUNCTION if exists pricesmart.fn_is_actual_hierarchy_same;


CREATE OR REPLACE FUNCTION pricesmart.fn_is_actual_hierarchy_same(input_filters jsonb, edit_pg_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    rec RECORD;
    db_filters JSONB := '{}';
    key TEXT;
    values_arr INT[];
    db_values_arr INT[];
BEGIN
    -- Loop through mapping to fetch keys and their hierarchy level
    FOR rec IN
        SELECT id_mapping, request_key
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = true
    LOOP
        -- Extract hierarchy values from actual data
        SELECT ARRAY_AGG(h.hierarchy_value ORDER BY h.hierarchy_value)
        INTO db_values_arr
        FROM pricesmart.tb_pg_hierarchy h
        WHERE h.pg_id = edit_pg_id
          AND h.hierarchy_level = rec.id_mapping
          AND h.is_temporary = 0;

        IF db_values_arr IS NULL THEN
            db_values_arr := ARRAY[]::INT[];
        END IF;

        -- Extract input values from input_filters json
        SELECT ARRAY(
            SELECT jsonb_array_elements_text(input_filters -> rec.request_key)::INT
            ORDER BY jsonb_array_elements_text(input_filters -> rec.request_key)::INT
        ) INTO values_arr;

        IF values_arr IS NULL THEN
            values_arr := ARRAY[]::INT[];
        END IF;

        -- Compare both arrays
        IF values_arr <> db_values_arr THEN
            RETURN FALSE;
        END IF;
    END LOOP;

    RETURN TRUE;
END;
$function$
;
