--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:cluster_smart.add_plan_product_attributes liquibase:add_plan_product_attributes runOnChange:true stripComments:false splitStatements:false context:in_argument_ integer_added  labels:liquibase_project_start
--comment: initial changeset for add_plan_product_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.add_plan_product_attributes(input text);
CREATE OR REPLACE FUNCTION cluster_smart.add_plan_product_attributes(input integer, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _query text;
    begin
	    execute 'DELETE FROM "cluster_smart".plan_product_attributes where cluster_plan_code = '|| $1 ||' ;';
        _query := 'INSERT INTO "cluster_smart".plan_product_attributes (
            select * from jsonb_to_recordset(''' || $2 || ''') 
            as performance(
                cluster_plan_code int,
                attribute_name character varying,
                is_primary boolean,
				is_final boolean
            )
        );';
    execute _query;
end $function$
;
