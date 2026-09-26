--liquibase formatted sql
--changeset priyansh.gautam:oms_delete_rcl_constraints runOnChange:true stripComments:false splitStatements:false context:initial labels:oms_delete_rcl_constraints
--comment: initial changeset for oms_delete_rcl_constraints_skipping_defaults
--rollback: SELECT 1

DROP FUNCTION if exists inventory_smart.oms_delete_rcl_constraints(product_filter jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.oms_delete_rcl_constraints(product_filter jsonb)
RETURNS void
LANGUAGE plpgsql
AS $function$
DECLARE
    _query_part text;
    _query_combine1 text;
    _query_combine2 text;
    _where text := '';
    _query_meta_filters text;
    _hash_cols text;
    _rcl_codes integer[];
    _pa_query text := '';
BEGIN
    -- Get the product attributes filter query
    _pa_query := global.form_main_table_filters('product_attributes_filter', product_filter);

    -- Get RCL codes and hash columns
    SELECT
        array_agg(rcl_code),
        'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' INTO _rcl_codes, _hash_cols
    FROM global.rcl_master
    WHERE NOT is_deleted
    AND module_code = '7001'
    AND not is_default
    group by is_deleted;

    RAISE NOTICE '_pa_query: %', _pa_query;

    _where := 'JOIN (
        SELECT rcl_code, rule_code, rule_name, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension
        FROM inventory_smart.rcl_oms_constraint_master_rule r
        JOIN (
            SELECT ' || _hash_cols || ' FROM global.product_attributes_filter ' || _pa_query || ' GROUP BY 1
        ) paf ON md5(r.rcl_dimension::text) = ANY(rcl_hash)
        AND r.rcl_code = ANY(' || quote_literal(_rcl_codes::text) || '::int[])
        GROUP BY 1,2,3,4,5
    ) r ON r.rule_code = c.rule_code AND r.rcl_code = c.rcl_code';

    _query_part := 'SELECT c.rcl_code, c.rule_code, r.rule_name, r.rcl_dimension
    FROM inventory_smart.rcl_oms_constraint_master c
    ' || _where || '
    GROUP BY c.rcl_code, c.rule_code, r.rule_name, r.rcl_dimension';

    -- Delete from rcl_oms_constraint_master_rule
    _query_combine1 := 'DELETE FROM inventory_smart.rcl_oms_constraint_master_rule ocmr
    USING (' || _query_part || ') A
    WHERE ocmr.rcl_code = A.rcl_code
    AND ocmr.rule_code = A.rule_code';

    -- Delete from rcl_oms_constraint_master
    _query_combine2 := 'DELETE FROM inventory_smart.rcl_oms_constraint_master ocm
    USING (' || _query_part || ') A
    WHERE ocm.rcl_code = A.rcl_code
    AND ocm.rule_code = A.rule_code';

    EXECUTE _query_combine2;
    EXECUTE _query_combine1;
END
$function$;