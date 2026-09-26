--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_insert_actual_pg_hierarchy_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_insert_actual_pg_hierarchy_1

DROP PROCEDURE if exists pricesmart.pc_insert_actual_pg_hierarchy;


CREATE OR REPLACE PROCEDURE pricesmart.pc_insert_actual_pg_hierarchy(IN _pg_id integer, IN _pg_hierarchy jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    rec RECORD;
    dyn_sql TEXT := '';
    first_query BOOLEAN := true;
BEGIN
    IF _pg_hierarchy IS NULL OR _pg_hierarchy = '{}'::jsonb THEN
		UPDATE pricesmart.tb_pg_hierarchy
        SET is_temporary = 0
        WHERE pg_id = _pg_id;

        RETURN; -- Exit procedure early
	END IF;
	-- Loop through hierarchy mappings
    FOR rec IN
        SELECT id_mapping, request_key, id_column, value_column
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = true
        ORDER BY id_mapping
    LOOP
        -- Only if the key exists in the input JSONB
        IF _pg_hierarchy ? rec.request_key THEN
            IF NOT first_query THEN
                dyn_sql := dyn_sql || ' UNION ALL ';
            ELSE
                first_query := false;
            END IF;

            -- Generate SQL for each hierarchy level
            dyn_sql := dyn_sql || format(
                $$SELECT DISTINCT
                          %s AS pg_id,
                          %s AS hierarchy_level,
                          vals.value::INT AS hierarchy_value,
                          pm.%I AS hierarchy_name,
                          0 AS is_temporary
                   FROM jsonb_array_elements_text(%L::jsonb -> '%s') AS vals(value)
                   LEFT JOIN pricesmart.product_master pm
                          ON pm.%I::INT = vals.value::INT
                   WHERE vals.value ~ '^\d+$'$$,
                _pg_id,                -- pg_id
                rec.id_mapping,        -- hierarchy_level
                rec.value_column,      -- hierarchy_name
                _pg_hierarchy::TEXT,   -- full JSONB as text
                rec.request_key,       -- key like l0_ids
                rec.id_column          -- join column like l0_cid
            );
        END IF;
    END LOOP;

    -- Execute the constructed dynamic SQL
    IF dyn_sql IS NOT NULL AND dyn_sql <> '' THEN
        dyn_sql := '
            INSERT INTO pricesmart.tb_pg_hierarchy 
                (pg_id, hierarchy_level, hierarchy_value, hierarchy_name, is_temporary)
            ' || dyn_sql || '
            ON CONFLICT (pg_id, hierarchy_level, hierarchy_value)
            DO UPDATE SET is_temporary = 0;';

        RAISE NOTICE 'dyn_sql : %', dyn_sql;
        EXECUTE dyn_sql;
    END IF;
END;
$procedure$
;
