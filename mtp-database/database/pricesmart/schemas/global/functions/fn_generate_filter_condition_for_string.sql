--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_generate_filter_condition_for_string runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_generate_filter_condition_for_string
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_generate_filter_condition_for_string;
CREATE OR REPLACE FUNCTION global.fn_generate_filter_condition_for_string(
    column_name text,
    comparision_operator text,
    comparision_value ANYELEMENT
)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    filtered_condition text;
BEGIN

    if comparision_operator = 'contains' then
        filtered_condition := format(' %1$s like %2$L ', column_name, '%' || comparision_value || '%');

    elsif comparision_operator = 'not_contains' then
        filtered_condition := format(' %1$s not like %2$L ', column_name, '%' || comparision_value || '%');

    elsif comparision_operator = 'equals' then
        filtered_condition := format(' %1$s = %2$L ', column_name, comparision_value);

    elsif comparision_operator = 'not_equals' then
        filtered_condition := format(' %1$s != %2$L ', column_name, comparision_value);
    
    elsif comparision_operator = 'starts_with' then
        filtered_condition := format(' %1$s like %2$L ', column_name, comparision_value || '%');

    elsif comparision_operator = 'ends_with' then
        filtered_condition := format(' %1$s like %2$L ', column_name, '%' || comparision_value);

    end if;

    return filtered_condition;
    
END;
$function$
;
