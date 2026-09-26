--liquibase formatted sql
--changeset sadhana.j:get_wedge_attributes runOnChange:true stripComments:false splitStatements:false context:restrict attr labels:liquibase_project_start
--comment: initial changeset for get_wedge_attributes - updated SP
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_wedge_attributes(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_wedge_attributes(input jsonb)
 RETURNS TABLE(attribute_name character varying, attribute_value character varying[])
 LANGUAGE plpgsql
AS $function$

/*
        Function/Procedure name: assort_smart.get_wedge_attributes
        Created by: Sadhana J
        Created at: 8-Mar-2022
        No of input parameter: 1
        Parameter Description : $1 = json

        Purpose: This function been created to get wedge attribute

        Calling Statement:

        select * from assort_smart.get_wedge_attributes('{
                      "filters": [
                        {
                          "attribute_name": "plan_code",
                          "operator": "in",
                          "value": [
                            "30"
                          ]
                        }]
                    }');

        Updated_by Updated_on Purpose
        *Sadhana J: added into assort-smart
*/

declare
_query_combine text;
_input_json json ;
_attribute_name text;
_operator text;
_prefix text;
_value text;
_where text;
_input_data jsonb;
_filter_data jsonb;

    begin

        _where:=null;
		_input_data:= $1::jsonb;
		_filter_data:=(_input_data->>'filters')::jsonb;

    	-- prepare where clause
    	_where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );

        _query_combine := 'SELECT attribute_name,
                        array_agg( distinct attribute_value) as attribute_value
                    FROM assort_smart.plan_wedge_opt_attribute
                    ' || ' ' ||_where || ' ' ||''
                    'and attribute_name not in (''Subcat'', ''subcat'', ''size_curve'')'
                    'group by attribute_name'
                    ;


        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
