--liquibase formatted sql
--changeset oms_team:oms_rule_list_constraint_dynamic runOnChange:true stripComments:false splitStatements:false
--comment: Dynamic vendor constraint rule list SP - backend provides select_columns, select_group_by, paf_filter from oms_sp_config_columns/filters

DROP FUNCTION IF EXISTS oms.oms_rule_list_constraint_dynamic(refcursor, jsonb, text[], jsonb, jsonb);
CREATE OR REPLACE FUNCTION oms.oms_rule_list_constraint_dynamic(
    input refcursor,
    product_filter jsonb,
    validity text[],
    meta_filters jsonb,
    sp_config jsonb DEFAULT NULL
)
RETURNS refcursor
LANGUAGE plpgsql
AS $function$
/*
  Dynamic Vendor Constraint Rule List SP (backend-driven config from CSV).

  Parameters:
    $1: input - Refcursor for result set
    $2: product_filter - JSONB with product attribute filters
    $3: validity - text[] (legacy, typically '{}')
    $4: meta_filters - JSONB with pagination, sort, search
    $5: sp_config - JSONB from backend (SPConfigManager.build_sp_config_json from oms_sp_config_columns + oms_sp_config_filters):
        {
          "select_columns": "c.rcl_code as rcl_code, c.rule_code as rule_code, ...",  -- from oms_sp_config_columns
          "select_group_by": "1,2,3,4,6,7,8,9,10,16,17,18",                          -- column_order of is_group_by columns
          "paf_filter": "AND active",                                                -- from oms_sp_config_filters (filter_type=paf_filter)
          "pack_ordering": true|false,   -- optional: adds " and ordering = 'Y'" to PAF
          "additional_joins": "LEFT JOIN ...",
          "additional_filters": "AND ..."
        }
  sp_config with select_columns is required (backend always provides via build_sp_config_json).
*/
DECLARE
    _query_part text;
    _query_combine text;
    _where text := '';
    _query_meta_filters text;
    _hash_cols text;
    _rcl_codes integer[];
    _pa_query text := '';
    _additional_joins text := '';
    _additional_filters text := '';
    _paf_extra text := '';
    v_select_columns text := '';
    v_select_group_by text := '';
    v_paf_filter text := '';
    v_gen_random_uuid text := gen_random_uuid()::varchar;
    v_error_message text;
BEGIN
    IF sp_config IS NULL OR sp_config = 'null'::jsonb THEN
        RAISE EXCEPTION 'SP configuration is required (must be provided by backend)';
    END IF;

    v_select_columns := COALESCE(TRIM(sp_config->>'select_columns'), '');
    IF v_select_columns = '' THEN
        RAISE EXCEPTION 'select_columns is required in sp_config';
    END IF;

    v_select_group_by := COALESCE(TRIM(sp_config->>'select_group_by'), '');
    v_paf_filter := COALESCE(TRIM(sp_config->>'paf_filter'), ' and active');
    IF v_paf_filter != '' AND left(v_paf_filter, 1) != ' ' AND left(v_paf_filter, 3) != 'AND' THEN
        v_paf_filter := ' ' || v_paf_filter;
    END IF;

    IF (sp_config->>'pack_ordering')::text = 'true' THEN
        _paf_extra := ' and ordering = ''Y''';
    END IF;
    _additional_joins := COALESCE(TRIM(sp_config->>'additional_joins'), '');
    _additional_filters := COALESCE(TRIM(sp_config->>'additional_filters'), '');
    IF _additional_filters != '' AND left(_additional_filters, 4) != ' AND ' THEN
        _additional_filters := ' AND ' || _additional_filters;
    END IF;

    _pa_query := global.form_main_table_filters('product_attributes_filter', product_filter);
    SELECT
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hashes'
    INTO _rcl_codes, _hash_cols
    FROM global.rcl_master
    WHERE NOT is_deleted
      AND module_code = '7001'
    GROUP BY is_deleted;

    _where := ' join (
        with paf as materialized(
            select * from
                (
                select unnest(rcl_hashes) as rcl_hash_paf, * from
                    (
                    select ' || _hash_cols || ', * from global.product_attributes_filter ' || _pa_query || v_paf_filter || _paf_extra || '
                    )x
                ) y where rcl_hash is not null
            )
        select rcl_code, rule_code, rule_name, md5(rcl_dimension::text) rcl_hash, rcl_dimension, paf.*
        from oms.rcl_oms_constraint_master_rule
        join paf on md5(rcl_dimension::text) = paf.rcl_hash_paf
        where rcl_code = any(' || quote_literal(_rcl_codes::text) || '::int[])
        ) r on r.rule_code = c.rule_code and r.rcl_code = c.rcl_code
    left join oms.oms_constraints_status ocs on ocs.product_code = r.product_code';
    IF _additional_joins != '' THEN
        _where := _where || E'\n    ' || _additional_joins;
    END IF;

    _query_meta_filters := oms.oms_form_rcl_table_query(meta_filters);

    v_select_columns := REPLACE(v_select_columns, E'\\n', ' ');
    v_select_columns := regexp_replace(v_select_columns, E'\\\\+\'', '''', 'g');

    IF v_select_group_by != '' THEN
        _query_part := 'SELECT ' || v_select_columns || '
    FROM "oms".rcl_oms_constraint_master c
    left join global.user_master u1 on u1.user_code = c.created_by
    left join global.user_master u2 on u2.user_code = c.updated_by
     ' || _where || '
    GROUP BY ' || v_select_group_by;
    ELSE
        _query_part := 'SELECT ' || v_select_columns || '
    FROM "oms".rcl_oms_constraint_master c
    left join global.user_master u1 on u1.user_code = c.created_by
    left join global.user_master u2 on u2.user_code = c.updated_by
     ' || _where || '
    GROUP BY c.rcl_code, c.rule_code, r.rule_name, r.rcl_dimension,
    c.min_replenishment_quantity, c.max_replenishment_quantity, c.level_of_application,
    c.order_multiple, c.moq_tolerance, c.pack_selection,
    c.updated_at, c.created_at, c.updated_by, u2.name';
    END IF;

    _query_combine := '
   select A.*
   from
   (SELECT
                p.*, rm.is_default
            FROM
                (' || _query_part || ') p
            JOIN global.rcl_master rm
            USING (rcl_code)
            WHERE NOT rm.is_deleted' || _additional_filters || ') as A
            ' || _query_meta_filters;

    IF _query_combine IS NULL THEN
        OPEN input FOR
            SELECT rcl_code,
                   rule_code,
                   rule_name,
                   rcl_dimension,
                   null::jsonb AS data
            FROM oms.rcl_oms_constraint_master_rule rocmr
            WHERE 1 = 2;
    ELSE
        OPEN input FOR EXECUTE _query_combine;
    END IF;
    RETURN input;

EXCEPTION
    WHEN OTHERS THEN
        v_error_message := SQLERRM;
        PERFORM global.sp_log(
            v_gen_random_uuid,
            'oms.oms_rule_list_constraint_dynamic',
            'ERROR',
            v_error_message,
            jsonb_build_object(
                'product_filter', product_filter,
                'meta_filters', meta_filters,
                'config_provided', sp_config IS NOT NULL,
                'sqlstate', SQLSTATE
            )
        );
        RAISE EXCEPTION 'Dynamic SP failed: % (SQLSTATE: %)', v_error_message, SQLSTATE;
END;
$function$;
