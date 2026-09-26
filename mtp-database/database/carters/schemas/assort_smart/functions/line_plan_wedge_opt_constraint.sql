
--liquibase formatted sql
--changeset liquibase:line_plan_wedge_opt_constraint_update  runOnChange:true stripComments:false splitStatements:false context:line_plan_wedge_opt_constraint labels:liquibase_project_start
--comment: initial changeset for line_plan_wedge_opt_constraint_update
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.line_plan_wedge_opt_constraint(jsonb);

CREATE OR REPLACE FUNCTION assort_smart.line_plan_wedge_opt_constraint(input jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _data_level text;
    _is_value_changed boolean;
    _min_value integer;
    _max_value integer;
    _increment integer;
    _min_size integer;
    _moq integer;
    _hierarchy_code text;
    _plan_code integer;
    _update_query text;
    _item jsonb;
    _query text;
_cluster_display_name TEXT;
_cluster_code TEXT;
BEGIN
   
    -- Extracting the 'data_level' and 'is_value_changed' from input JSON
    _data_level := $1->>'data_level';
    _is_value_changed := ($1->>'is_value_changed')::boolean;

    -- Loop through items array in the JSON input
    FOR _item IN SELECT * FROM jsonb_array_elements($1->'items') LOOP
        _plan_code := (_item->>'plan_code')::integer;
        _min_value := (_item->>'min_value')::integer;
        _max_value := (_item->>'max_value')::integer;
        _increment := (_item->>'increment')::integer;
        _min_size := (_item->>'min_size')::integer;
        _moq := (_item->>'moq')::integer;
        _hierarchy_code := _item->>'hierarchy_code';
        _cluster_display_name:=(_item->>'cluster_display_name');
        _cluster_code := _item->>'cluster_code';
 
        -- Logic for handling the different 'data_level'
        IF _data_level = 'cluster_code' THEN
            RAISE NOTICE 'Data Level: cluster_code';
_query := FORMAT('UPDATE assort_smart.plan_wedge_opt_constraint_wp
             SET min_size = %s, min_value = %s, max_value = %s, "increment" = %s, moq = %s,cluster_display_name= %s
             WHERE plan_code = %s AND cluster_code = %s',
            _min_size, _min_value, _max_value, _increment, _moq,quote_literal(_cluster_display_name), _plan_code, quote_literal(_cluster_code)
        );
            -- Handle cluster_code case (if applicable)
 RAISE NOTICE 'Cluster Query: %', _query;
        ELSE 
            RAISE NOTICE 'Data Level: Other';
            -- Build the update query for the other cases
            _query := FORMAT(
                'UPDATE assort_smart.plan_wedge_opt_constraint_wp
                 SET min_size = %s, min_value = %s, max_value = %s, "increment" = %s, moq = %s
                 WHERE plan_code = %s AND hierarchy_code = %s',
                _min_size, _min_value, _max_value, _increment, _moq, _plan_code, quote_literal(_hierarchy_code)
            );
 RAISE NOTICE 'Level Query: %', _query;
            -- Execute the update query
            EXECUTE _query;
        END IF;
    END LOOP;

END;
$function$
;


