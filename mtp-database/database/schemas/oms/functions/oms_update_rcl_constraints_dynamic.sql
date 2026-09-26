--liquibase formatted sql
--changeset oms_team:oms_update_rcl_constraints_dynamic runOnChange:true stripComments:false splitStatements:false
--comment: Primark dynamic vendor constraint rule set-all SP - PAF and filters via sp_config JSONB

DROP FUNCTION IF EXISTS oms.oms_update_rcl_constraints_dynamic(jsonb, jsonb, jsonb, jsonb, integer, jsonb);
CREATE OR REPLACE FUNCTION oms.oms_update_rcl_constraints_dynamic(
    _selections jsonb,
    _product_filters jsonb,
    _values jsonb,
    _meta_filters jsonb,
    _updated_by integer,
    sp_config jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Vendor Constraint Rule Set-All SP for Primark.
  PAF and optional joins configurable via sp_config (oms_sp_config_master + oms_sp_config_filters).

  Parameters:
    $1: _selections - JSONB array of row identifiers (e.g. [{"rule_code": 32322}, ...]); empty for select-all
    $2: _product_filters - JSONB product attribute filters (used when _selections is empty)
    $3: _values - JSONB array of constraint values to apply
    $4: _meta_filters - JSONB with sort/limit (for select-all branch)
    $5: _updated_by - User ID performing the update
    $6: sp_config - JSONB from Primark config (e.g. oms_vendor_constraint_rule_set_all):
        {
          "paf_filter": " and paf.active",     -- PAF subquery suffix (Primark uses this)
          "pack_ordering": true|false,         -- when true, adds " and ordering = 'Y'" to PAF
          "additional_joins": "LEFT JOIN ...",
          "additional_filters": "AND ..."
        }
  When sp_config is NULL or empty, default PAF is " and active and ordering = 'Y'".
  Combines behaviour of Primark static and pack set-all SPs (pack_selection, validation, sparse update).
*/
DECLARE
    _where text := '';
    _final varchar[];
    _query_meta_filters text;
    _pa_query text;
    _hash_cols text;
    _rcl_codes integer[];
    _key text;
    _value text;
    _con text[];
    _set jsonb;
    _sets text;
    _key_cols text;
    _temp_sql text;
    _rule_name text;
    _temp_table text := gen_random_uuid();
    _temp_table_2 text := gen_random_uuid();
    _include_pack_selection bool;
    _paf_extra text := ' and active and ordering = ''Y''';
    _additional_joins text := '';
    _additional_filters text := '';
BEGIN
    -- Optional config-driven PAF and filters
    IF sp_config IS NOT NULL AND sp_config != 'null'::jsonb THEN
        IF (sp_config->>'paf_filter') IS NOT NULL AND TRIM(sp_config->>'paf_filter') != '' THEN
            _paf_extra := ' ' || TRIM(sp_config->>'paf_filter');
        END IF;
        IF (sp_config->>'pack_ordering')::text = 'true' THEN
            IF _paf_extra NOT LIKE '%ordering%' THEN
                _paf_extra := _paf_extra || ' and ordering = ''Y''';
            END IF;
        END IF;
        _additional_joins := COALESCE(TRIM(sp_config->>'additional_joins'), '');
        _additional_filters := COALESCE(TRIM(sp_config->>'additional_filters'), '');
        IF _additional_filters != '' AND left(_additional_filters, 4) != ' AND ' THEN
            _additional_filters := ' AND ' || _additional_filters;
        END IF;
    END IF;

    _query_meta_filters := oms.form_rcl_table_query(_meta_filters);
    _pa_query := global.form_main_table_filters('product_attributes_filter', _product_filters);
    SELECT
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes'
    INTO _rcl_codes, _hash_cols
    FROM global.rcl_master
    WHERE NOT is_deleted
      AND module_code = '7001'
    GROUP BY is_deleted;

    IF jsonb_array_length(_selections) > 0 THEN
        FOR _set IN SELECT * FROM jsonb_array_elements(_selections) LOOP
            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP
                _con := array_append(_con, _key || ' = ' || _value);
            END LOOP;
            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') || ')');
            _con := '{}';
        END LOOP;

        IF cardinality(_final) > 0 THEN
            _where := ' WHERE ' || array_to_string(_final, ' OR ');
        END IF;

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rcl_code, rule_code, pack_selection, min_replenishment_quantity, max_replenishment_quantity, order_multiple, moq_tolerance, level_of_application, ' || _updated_by || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM oms.rcl_oms_constraint_master' || _where || ' GROUP BY 1,2,3,4,5,6,7,8,9';
        EXECUTE _temp_sql;
    ELSE
        _where := ' join (
        with paf as materialized(select rcl_hash from
                                    (
                                    select unnest(rcl_hashes) as rcl_hash from
                                        (
                                        select ' || _hash_cols || ' from global.product_attributes_filter ' || _pa_query || _paf_extra || '
                                        )x
                                    ) y where rcl_hash is not null group by 1
                                )
            select rcl_code, rule_code, rule_name, md5(rcl_dimension::text) rcl_hash, rcl_dimension from oms.rcl_oms_constraint_master_rule where rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[]) and md5(rcl_dimension::text)
                in (
                    select rcl_hash from paf
                    )
                    group by 1,2,3,4
                ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code ';
        IF _additional_joins != '' THEN
            _where := _where || E'\n    ' || _additional_joins;
        END IF;

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rcl_code, c.rule_code, c.pack_selection, c.min_replenishment_quantity, c.max_replenishment_quantity, c.order_multiple, c.moq_tolerance, c.level_of_application, ' || _updated_by || ' AS updated_by, MAX(created_at) created_at, MAX(created_by) created_by FROM oms.rcl_oms_constraint_master c' || _where || _query_meta_filters || ' group by 1,2,3,4,5,6,7,8,9';
        EXECUTE _temp_sql;
    END IF;

    -- Validate level_of_application and update rule_name if provided
    DECLARE
        has_size_rules BOOLEAN;
    BEGIN
        FOR _set IN SELECT * FROM jsonb_array_elements(_values) LOOP
            IF (_set ? 'level_of_application') AND (_set->>'level_of_application' = 'sum_all') THEN
                _temp_sql := '
                    WITH user_modified_rules AS (
                        SELECT t.rule_code, t.rcl_code FROM "' || _temp_table || '" t
                    ),
                    size_rules AS (
                        SELECT r.rule_code
                        FROM user_modified_rules umr
                        JOIN oms.rcl_oms_constraint_master_rule r
                        ON r.rule_code = umr.rule_code AND r.rcl_code = umr.rcl_code
                        WHERE r.rcl_dimension::jsonb ? ''size''
                    )
                    SELECT COUNT(*) > 0 FROM size_rules;
                ';
                EXECUTE _temp_sql INTO has_size_rules;
                IF has_size_rules THEN
                    RAISE EXCEPTION 'Save failed due to validation on level of application.';
                END IF;
            END IF;

            IF (_set->>'rule_name') IS NOT NULL THEN
                _rule_name := _set->>'rule_name';
                _temp_sql := 'UPDATE oms.rcl_oms_constraint_master_rule SET rule_name = ' || quote_literal(_rule_name) || ' WHERE (rule_code, rcl_code) IN (SELECT rule_code, rcl_code FROM "' || _temp_table || '")';
                EXECUTE _temp_sql;
            END IF;
            EXIT;
        END LOOP;
    END;

    _temp_sql := 'DELETE FROM oms.rcl_oms_constraint_master WHERE (rule_code) IN (SELECT rule_code FROM "' || _temp_table || '")';
    EXECUTE _temp_sql;

    FOR _set IN SELECT * FROM jsonb_array_elements(_values) LOOP
        _temp_sql := '';
        _sets := '';
        _key_cols := '';

        -- Conditionally build CREATE TEMP TABLE columns with validation (same as pack SP)
        IF _set ? 'min_replenishment_quantity' THEN
            BEGIN
                PERFORM (_set->>'min_replenishment_quantity')::int;
                _sets := _sets || '(' || quote_literal(_set->>'min_replenishment_quantity') || ')::int as min_replenishment_quantity,';
                _key_cols := _key_cols || 'CASE WHEN y.min_replenishment_quantity IS NOT NULL THEN y.min_replenishment_quantity WHEN x.min_replenishment_quantity IS NOT NULL THEN x.min_replenishment_quantity ELSE 1 END,';
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'Invalid min_replenishment_quantity value: %. Error: %', _set->>'min_replenishment_quantity', SQLERRM;
            END;
        END IF;
        IF _set ? 'max_replenishment_quantity' THEN
            BEGIN
                PERFORM (_set->>'max_replenishment_quantity')::int;
                _sets := _sets || '(' || quote_literal(_set->>'max_replenishment_quantity') || ')::int as max_replenishment_quantity,';
                _key_cols := _key_cols || 'CASE WHEN y.max_replenishment_quantity IS NOT NULL THEN y.max_replenishment_quantity WHEN x.max_replenishment_quantity IS NOT NULL THEN x.max_replenishment_quantity ELSE 99999 END,';
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'Invalid max_replenishment_quantity value: %. Error: %', _set->>'max_replenishment_quantity', SQLERRM;
            END;
        END IF;
        IF _set ? 'order_multiple' THEN
            BEGIN
                PERFORM (_set->>'order_multiple')::int;
                _sets := _sets || '(' || quote_literal(_set->>'order_multiple') || ')::int as order_multiple,';
                _key_cols := _key_cols || 'CASE WHEN y.order_multiple IS NOT NULL THEN y.order_multiple WHEN x.order_multiple IS NOT NULL THEN x.order_multiple ELSE 1 END,';
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'Invalid order_multiple value: %. Error: %', _set->>'order_multiple', SQLERRM;
            END;
        END IF;
        IF _set ? 'moq_tolerance' THEN
            BEGIN
                PERFORM (_set->>'moq_tolerance')::float4;
                _sets := _sets || '(' || quote_literal(_set->>'moq_tolerance') || ')::float4 as moq_tolerance,';
                _key_cols := _key_cols || 'CASE WHEN y.moq_tolerance IS NOT NULL THEN y.moq_tolerance::float4 WHEN x.moq_tolerance IS NOT NULL THEN x.moq_tolerance::float4 ELSE 0.5 END,';
            EXCEPTION WHEN OTHERS THEN
                RAISE EXCEPTION 'Invalid moq_tolerance value: %. Error: %', _set->>'moq_tolerance', SQLERRM;
            END;
        END IF;
        IF _set ? 'level_of_application' THEN
            _sets := _sets || '(' || quote_literal(_set->>'level_of_application') || ')::varchar as level_of_application,';
            _key_cols := _key_cols || 'y.level_of_application,';
        END IF;
        IF _set ? 'pack_selection' THEN
            _sets := _sets || '(' || quote_literal(_set->>'pack_selection') || ')::varchar as pack_selection,';
            _include_pack_selection := true;
        ELSE
            _include_pack_selection := false;
        END IF;

        _sets := RTRIM(_sets, ',');
        _key_cols := RTRIM(_key_cols, ',');

        IF _sets <> '' THEN
            EXECUTE 'DROP TABLE IF EXISTS "' || _temp_table_2 || '";';
            _temp_sql := 'CREATE TEMP TABLE "' || _temp_table_2 || '" AS SELECT ' || _sets || ';';
            EXECUTE _temp_sql;

            _temp_sql := 'INSERT INTO oms.rcl_oms_constraint_master
                (rcl_code, rule_code' ||
                CASE WHEN _key_cols LIKE '%min_replenishment_quantity%' THEN ', min_replenishment_quantity' ELSE '' END ||
                CASE WHEN _key_cols LIKE '%max_replenishment_quantity%' THEN ', max_replenishment_quantity' ELSE '' END ||
                CASE WHEN _key_cols LIKE '%order_multiple%' THEN ', order_multiple' ELSE '' END ||
                CASE WHEN _key_cols LIKE '%moq_tolerance%' THEN ', moq_tolerance' ELSE '' END ||
                CASE WHEN _key_cols LIKE '%level_of_application%' THEN ', level_of_application' ELSE '' END ||
                ', pack_selection, created_by, created_at, updated_by, updated_at) ' ||
                'SELECT x.rcl_code, x.rule_code' ||
                CASE WHEN _key_cols <> '' THEN ', ' || _key_cols ELSE '' END ||
                CASE WHEN _include_pack_selection THEN ', y.pack_selection' ELSE ', x.pack_selection' END ||
                ', x.created_by, x.created_at, x.updated_by, NOW()
                FROM "' || _temp_table || '" x CROSS JOIN "' || _temp_table_2 || '" y';
            EXECUTE _temp_sql;
        END IF;
    END LOOP;
END;
$function$;
