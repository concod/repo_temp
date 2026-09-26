--liquibase formatted sql
--changeset liquibase:add_plan_performance_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_plan_performance_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.add_plan_performance_attributes(input integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.add_plan_performance_attributes(input integer, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _query text;
    begin
	    execute 'DELETE FROM cluster_smart.plan_performance_attributes where cluster_plan_code = '|| $1 ||' ;';
        _query := 'INSERT INTO cluster_smart.plan_performance_attributes (
            select * from jsonb_to_recordset(''' || $2 || ''')
            as performance(
                cluster_plan_code int,
                attribute_name character varying,
                score float,
                rank int,
				is_final bool,
				levels jsonb
            )
        );';
    execute _query;
end $function$
;
