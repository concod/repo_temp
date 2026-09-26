--liquibase formatted sql
--changeset liquibase:add_plan_product_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for add_plan_product_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.add_plan_product_attributes(input integer, text);
CREATE OR REPLACE FUNCTION assort.add_plan_product_attributes(input integer, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
    _query text;
    begin
	    execute 'DELETE FROM "assort".plan_product_attributes where plan_code = '|| $1 ||' ;';
        _query := 'INSERT INTO "assort".plan_product_attributes (
            select * from jsonb_to_recordset(''' || $2 || ''') 
            as performance(
                plan_code int,
                attribute_name character varying,
                is_primary boolean,
				is_final boolean
            )
        );';
    execute _query;
end $function$

;