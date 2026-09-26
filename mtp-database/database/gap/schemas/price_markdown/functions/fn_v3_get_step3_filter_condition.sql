--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_filter_condition-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_filter_condition-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_filter_condition;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_filter_condition(column_name text, operator text, value1 text, value2 text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
declare
    condition text;
    is_numeric boolean := value1 ~ '^[+-]?[0-9]*\.?[0-9]+$';
    is_date boolean := value1 ~ '^\d{4}-\d{2}-\d{2}$';
    formatted_value1 text;
    formatted_value2 text;
begin
    if is_numeric then
        formatted_value1 := value1;
    elsif is_date then
        formatted_value1 := quote_literal(value1) || '::date';
    else
        formatted_value1 := quote_literal(value1);
    end if;

    if value2 is not null then
        if value2 ~ '^[+-]?[0-9]*\.?[0-9]+$' then
            formatted_value2 := value2;
        elsif value2 ~ '^\d{4}-\d{2}-\d{2}$' then
            formatted_value2 := quote_literal(value2) || '::date';
        else
            formatted_value2 := quote_literal(value2);
        end if;
    end if;

    if operator = 'greater_than' then
        condition := format('%s > %s', column_name, formatted_value1);
    elsif operator = 'greater_than_or_equals' then
        condition := format('%s >= %s', column_name, formatted_value1);
    elsif operator = 'less_than' then
        condition := format('%s < %s', column_name, formatted_value1);
    elsif operator = 'less_than_or_equals' then
        condition := format('%s <= %s', column_name, formatted_value1);
    elsif operator = 'equals' then
        condition := format('%s = %s', column_name, formatted_value1);
    elsif operator = 'not_equals' then
        condition := format('%s != %s', column_name, formatted_value1);
    elsif operator = 'between' and value2 is not null then
        condition := format('%s between %s and %s', column_name, formatted_value1, formatted_value2);
    elsif operator = 'contains' then
        condition := format('%s like %s', column_name, quote_literal('%' || value1 || '%'));
    elsif operator = 'not_contains' then
        condition := format('%s not like %s', column_name, quote_literal('%' || value1 || '%'));
    elsif operator = 'starts_with' then
        condition := format('%s like %s', column_name, quote_literal(value1 || '%'));
    elsif operator = 'ends_with' then
        condition := format('%s like %s', column_name, quote_literal('%' || value1));
    end if;

    return condition;
end;
$function$
;
