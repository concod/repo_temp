--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:add_plan_store_attributes runOnChange:true stripComments:false splitStatements:false context:MTP-31708 labels:liquibase_project_start
--comment: initial changeset for cluster_smart_add_plan_store_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.add_plan_store_attributes(input integer, text);
CREATE OR REPLACE FUNCTION cluster_smart.add_plan_store_attributes(input integer, text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
/*
    Author : Hemanth C S
    Date: 29-01-2024

    Deletes the existing store_attributes and persists the updated store_attributes for clustering.

    Calling Statement: select * from cluster_smart.add_plan_store_attributes(77,'[{"cluster_plan_code": 81, "attribute_name": "region", "is_primary": false, "is_final": true}, {"cluster_plan_code": 81, "attribute_name": "climate", "is_primary": false, "is_final": false}]');
*/
declare
    _query text;
    begin
	    execute 'DELETE FROM "cluster_smart".plan_store_attributes where cluster_plan_code = '|| $1 ||' ;';
        _query := 'INSERT INTO "cluster_smart".plan_store_attributes (
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