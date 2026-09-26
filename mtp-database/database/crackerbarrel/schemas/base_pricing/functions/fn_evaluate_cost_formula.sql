--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_evaluate_cost_formula stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_evaluate_cost_formula

DROP FUNCTION IF EXISTS base_pricing.fn_evaluate_cost_formula;

CREATE OR REPLACE FUNCTION base_pricing.fn_evaluate_cost_formula(formula text, cost_components jsonb)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    v_evaluated_formula text;
    v_result numeric;
    v_key text;
    v_value numeric;
BEGIN
    v_evaluated_formula := formula;
    
    -- Replace all named parameters with their actual values from cost_components
    FOR v_key, v_value IN 
        SELECT key, value::numeric 
        FROM jsonb_each_text(cost_components)
    LOOP
        v_evaluated_formula := REPLACE(
            v_evaluated_formula, 
            '{' || v_key || '}', 
            v_value::text
        );
    END LOOP;
    
    -- Evaluate the formula safely
    EXECUTE 'SELECT ' || v_evaluated_formula INTO v_result;
    
    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 0; -- Return 0 if formula evaluation fails
END;
$function$
;