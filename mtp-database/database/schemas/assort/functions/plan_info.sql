--liquibase formatted sql
--changeset liquibase:plan_info runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for plan_info
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.plan_info(input integer);
CREATE OR REPLACE FUNCTION assort.plan_info(input integer)
 RETURNS TABLE(plan_code integer, name character varying, description text, selling_period_sdate date, selling_period_edate date, status smallint, compare_year smallint, special_classification character varying, is_deleted boolean, created_at timestamptz, updated_at timestamptz, created_by integer, updated_by integer, steps numeric, channel character varying[], hierarchy_level character varying, attributes jsonb)
 LANGUAGE plpgsql
AS $function$
    declare 
        _query text;
    begin
        _query := '
            select main.* , pa.attr as attributes from (
                select * from "assort".plan_master where plan_code = ' || $1 || ' ) main
                left join
                (
                    select 
                        plan_code, 
                        jsonb_agg(json_build_object(''name'', attribute_name, ''value'', attribute_value)) as attr
                    from "assort".plan_attributes where plan_code = ' || $1 || ' group by 1) pa
                on main.plan_code = pa.plan_code
        ';
         raise notice '%', _query;
         return QUERY execute _query;
    end $function$

;