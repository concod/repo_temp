--liquibase formatted sql
--changeset liquibase:get_rule_engine_carryover_flow_global runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_rule_engine_carryover_flow_global
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_rule_engine_carryover_flow_global();
CREATE OR REPLACE FUNCTION global.get_rule_engine_carryover_flow_global()
 RETURNS TABLE(rule_id integer, rule_level jsonb, priority jsonb, rule_type character varying, column_name character varying, column_value jsonb, is_active boolean)
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: global.get_rule_engine_carryover_flow_global
        Created by: hemant kumar singh
        Created at: 10-Mar-2023
        No of input parameter: 0
        Parameter Description : None

        Purpose: This function been created to get wedge attribute

        Calling Statement:

        select * from global.get_rule_engine_carryover_flow_global();

        Updated_by Updated_on Purpose
        hemant kumar singh 10-03-2023: getting rule engine carryover flow global 
*/

declare
_query_combine text;
    begin

        _query_combine := '
							SELECT rule_id, rule_level, priority, rule_type, column_name, column_value, is_active 
							FROM "global".rule_engine_carryover_flow
							where rule_level->>''type'' = ''Global''
							order by rule_id'
                    ;

        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
