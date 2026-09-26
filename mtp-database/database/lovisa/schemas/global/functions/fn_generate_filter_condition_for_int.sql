--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_generate_filter_condition_for_int runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for fn_generate_filter_condition_for_int
--rollback: SELECT 1
DROP FUNCTION if exists global.fn_generate_filter_condition_for_int;
CREATE OR REPLACE FUNCTION global.fn_generate_filter_condition_for_int(
    column_name text,
    comparision_operator text,
    comparision_value1 ANYELEMENT,
    comparision_value2 ANYELEMENT default null::numeric
)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    filtered_condition text;
BEGIN

    if comparision_operator = 'greater_than' then
        filtered_condition := format(' %1$s > %2$s ', column_name, comparision_value1);

    elsif comparision_operator = 'greater_than_or_equals' then
        filtered_condition := format(' %1$s >= %2$s ', column_name, comparision_value1);

    elsif comparision_operator = 'less_than' then
        filtered_condition := format(' %1$s < %2$s ', column_name, comparision_value1);
    
    elsif comparision_operator = 'less_than_or_equals' then
        filtered_condition := format(' %1$s <= %2$s ', column_name, comparision_value1);
    
    elsif comparision_operator = 'between' then
        filtered_condition := format(' %1$s between %2$s and %3$s ', column_name, comparision_value1, comparision_value2);

    elsif comparision_operator = 'equals' then
        filtered_condition := format(' %1$s = %2$s ', column_name, comparision_value1);
    
    elsif comparision_operator = 'not_equals' then
        filtered_condition := format(' %1$s != %2$s ', column_name, comparision_value1);
    
    end if;

    return filtered_condition;
    
END;
$function$
;
