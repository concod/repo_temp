--liquibase formatted sql
--changeset liquibase:get_plan_nle_quarter_flow runOnChange:true stripComments:false splitStatements:false context:MTP-34365_query_updated labels:liquibase_project_start
--comment: initial changeset for get_plan_nle_quarter_flow
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_nle_quarter_flow(jsonb);
CREATE OR REPLACE FUNCTION assort.get_plan_nle_quarter_flow(jsonb)
 RETURNS TABLE(flow character varying[], quarter text)
 LANGUAGE plpgsql
AS $function$
 /*
 Function/Procedure name: assort.get_plan_nle_quarter_flow
 Created by: Hemant Kumar
 Created at: 01-Feb-2024
 Update at: 01-Feb-2024
 No of input parameter: 1
 Parameter Description : $1, jsonb
 
 Purpose: This function been created to get flow and quarter details for NLE wedge details
 
 Calling Statement:
SELECT assort.get_plan_nle_quarter_flow('{"filters":[{"attribute_name":"plan_code","value":[2655],"operator":"in"}]}');

 
 Hemant Kumar:
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
                _where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );
            _query_combine := 'select array_agg(distinct (flow))::varchar[] as flow, CONCAT(''qtr'','''',quarter) as quarter from (
                                    select distinct on (drop,flow) * from (
                                        select distinct drop, flow,Quarter, sum(count_days) as days
                                        from(
                                        select drop,flow,fm,(fm::int - 1)/3 + 1 as Quarter, count(distinct calendar_date) as count_days 
                                        from (
                                        select drop,flow,flow_length,
                                            (selling_period_edate - interval ''1 WEEK''*(weeks_from_end) + interval ''1 DAY'')flow_start_date,
                                            (selling_period_edate - interval ''1 WEEK''*(weeks_from_end - flow_length))flow_end_date
                                            , selling_period_sdate,selling_period_edate
                                        from 
                                            (select *,sum(flow_length) over (partition by drop order by flow_rank) as weeks_from_end
                                            from(
                                            select * ,
                                            rank() over (partition by drop order by flow desc) as flow_rank
                                            from (
                                                select plan_code,concat(split_part(attribute_name,''_'',1), ''_'',  split_part(attribute_name,''_'',2)) as drop,
                                                concat(split_part(attribute_name,''_'',3), ''_'',  split_part(attribute_name,''_'',4)) as flow,
                                                attribute_value::int as flow_length
                                                from assort.plan_attributes
                                                ' || _where ||' and attribute_name like (''%flow%'')
                                                )a)b
                                            left join (select plan_code, selling_period_sdate,selling_period_edate from assort.plan_master) pms
                                            using(plan_code)) as base) flow_base
                                        join assort.fiscal_calendar fc 
                                        on fc.calendar_date  between flow_base.flow_start_date and flow_base.flow_end_date
                                        group by drop, flow, fm
                                        ) as base
                                        where count_days > (7/2)
                                        group by 1,2,3) final_tbl
                                        order by drop,flow,days desc
                                        ) as tbl
                                        group by quarter ';
            raise notice '%', _query_combine;
            RETURN QUERY execute _query_combine;
        end
$function$
;
