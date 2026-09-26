--liquibase formatted sql
--changeset liquibase:dc_store_policy_rule_by_id runOnChange:true stripComments:false splitStatements:false context:MTP-63019 labels:MTP-63019
--comment: copied version pre rule_expression
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.dc_store_policy_rule_by_id(refcursor, int4, text);
CREATE OR REPLACE FUNCTION inventory_smart.dc_store_policy_rule_by_id(input refcursor, _rule_code integer, screen text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_part text;
    _final_query text;
BEGIN

    _query_part := 'WITH user_rule_values AS (
        SELECT
            rule_code,
            rule_name,
            key AS rule_key,
            value AS user_value
        FROM
            inventory_smart.dc_store_policy_user_rule,
            jsonb_each(values)
        WHERE
            rule_code = '|| _rule_code ||'
    ), ';

    _query_part := _query_part || 'default_values AS (
        SELECT
            rule_name,
            rule_structure,
            rule_key,
            key AS rule_key_flat,
            value AS default_value,
            rule_type,
            is_mandatory
        FROM
            inventory_smart.dc_store_policy_rule,
            jsonb_each(default_value::jsonb)
        WHERE
            rule_type='''|| screen || '''
    ), ';

    _query_part := _query_part || 'final_values AS (
        SELECT
            dv.rule_name,
            dv.rule_structure,
            dv.is_mandatory,
			jsonb_build_object(dv.rule_key_flat, COALESCE(urv.user_value, dv.default_value)) AS selected_value,
            CASE
                WHEN urv.user_value IS NOT NULL THEN true
                ELSE false
            END AS is_visible
        FROM
            default_values dv
        LEFT JOIN
            user_rule_values urv
        ON
            dv.rule_key_flat = urv.rule_key
    ) ';

    _final_query := 'SELECT rule_name, rule_structure, is_mandatory, selected_value, is_visible FROM final_values;';

	raise notice '_final_query --- %', _final_query;
    OPEN $1 FOR execute _query_part || _final_query;
    RETURN $1;
END;
$function$
;
