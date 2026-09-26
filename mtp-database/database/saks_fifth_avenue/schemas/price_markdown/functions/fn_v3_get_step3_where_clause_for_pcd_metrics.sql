--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_v3_get_step3_where_clause_for_pcd_metrics-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_v3_get_step3_where_clause_for_pcd_metrics-1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_v3_get_step3_where_clause_for_pcd_metrics;


CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_step3_where_clause_for_pcd_metrics(_pcd_metrics_filter jsonb DEFAULT NULL::jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    pcd_metric_key text;
    pcd_metric_value jsonb;
    operator text;
    value1 text;
    value2 text;
    condition text;
    conditions text[] := '{}';
BEGIN
    IF _pcd_metrics_filter IS NULL OR jsonb_typeof(_pcd_metrics_filter) != 'object' THEN
        RETURN '';
    END IF;

    FOR pcd_metric_key, pcd_metric_value IN SELECT * FROM jsonb_each(_pcd_metrics_filter) LOOP
        operator := pcd_metric_value->>'operator';
        value1 := pcd_metric_value->>'value1';
        value2 := nullif(pcd_metric_value->>'value2', '');

        IF value2 IS NOT NULL THEN 
            condition := price_markdown.fn_v3_get_step3_filter_condition(
                format('round((pcd_metrics->>%L)::numeric, 2)', pcd_metric_key), 
                operator, 
                value1, 
                value2
            );
        ELSE
            condition := price_markdown.fn_v3_get_step3_filter_condition(
                format('round((pcd_metrics->>%L)::numeric, 2)', pcd_metric_key), 
                operator, 
                value1
            );
        END IF;
        
        IF condition IS NOT NULL THEN
            conditions := array_append(conditions, condition);
        END IF;
    END LOOP;

    RETURN CASE
        WHEN array_length(conditions, 1) > 0 THEN 'where ' || array_to_string(conditions, ' and ')
        ELSE ''
    END;
END;
$function$
;
