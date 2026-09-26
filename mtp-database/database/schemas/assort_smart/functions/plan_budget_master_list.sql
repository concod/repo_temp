--liquibase formatted sql
--changeset liquibase:plan_budget_master_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_budget_master_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.plan_budget_master_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.plan_budget_master_list(input jsonb)
 RETURNS TABLE(plan_budget_id integer, plan_code integer, levels jsonb, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort.plan_budget_master_list
Created by: Mohammed Ayaz
Created at: 7-Jan-2023
Update at: 7-Jan-2023
No of input parameter: 1
Parameter Description : $1, jsonb

Purpose: This function been created to get plan_budget details for plan-review-screen

Calling Statement:
SELECT * from assort_smart.plan_budget_master_list({'filters': [
        {'attribute_name': 'plan_code', 'value': ['1735'
            ], 'prefix': None, 'operator': 'in'
        },
        {'attribute_name': 'l0_name', 'value': ['Home'
            ], 'prefix': 'levels', 'operator': 'in'
        },
        {'attribute_name': 'l1_name', 'value': ['Home'
            ], 'prefix': 'levels', 'operator': 'in'
        },
        {'attribute_name': 'l2_name', 'value': ['Textiles'
            ], 'prefix': 'levels', 'operator': 'in'
        },
        {'attribute_name': 'store_type', 'value': ['Full Line Retail'
            ], 'prefix': None, 'operator': 'in'
        },
        {'attribute_name': 'start_date', 'value': ['2023-07-30'
            ], 'prefix': None, 'operator': 'in'
        },
        {'attribute_name': 'end_date', 'value': ['2023-10-28'
            ], 'prefix': None, 'operator': 'in'
        },
        {'attribute_name': 'compare_type', 'value': ['-1'
            ], 'prefix': None, 'operator': 'in'
        },
        {'attribute_name': 'is_grouping', 'value': ['false'
            ], 'prefix': None, 'operator': 'in'
        }
    ]
});

Mohammed Ayaz:
*/
declare
	_query_combine text;
	_where text;
	_input_data jsonb;
	_filter_data jsonb;
	begin
		_where:=null;
		_input_data:= $1::jsonb;
		_filter_data:=(_input_data->>'filters')::jsonb;

    	-- prepare where clause
        _where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );
    
		_query_combine := 'select plan_budget_id, plan_code, levels, attribute_value  from
    							assort_smart.plan_budget_master  ' || _where ||'
							order by plan_budget_id';
		raise notice '%', _query_combine;
		RETURN QUERY execute _query_combine;
 	end
$function$
;