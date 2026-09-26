--liquibase formatted sql
--changeset sadhana.j:get_plan_product_attribute_name runOnChange:true stripComments:false splitStatements:false context:drop_old_sp labels:liquibase_project_start
--comment: droping old SP get_plan_product_attribute_name
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort_smart.get_plan_product_attribute_name(input integer);

DROP FUNCTION IF EXISTS assort_smart.get_plan_product_attribute_name(input integer, boolean);

CREATE OR REPLACE FUNCTION assort_smart.get_plan_product_attribute_name(input integer, boolean DEFAULT true)
 RETURNS TABLE(attribute_name character varying)
 LANGUAGE plpgsql
AS $function$
 declare
 _query_combine text;

     begin
 	    /*
             Function/Procedure name: assort_smart.get_plan_product_attribute_name
             Created by: Sadhana J
             Created at: 09-Mar-2022
             No of input parameter: 1
             Parameter Description : $1 = int

             Purpose: This function been created to get plan-attribute if is_final true

             Calling Statement:

             select * from assort_smart.get_plan_product_attribute_name(30);

             Updated_by Updated_on Purpose
             * Sadhana J: added into assort-smart
             */

   _query_combine := 'SELECT attribute_name
							FROM cluster_smart.plan_product_attributes
							where cluster_plan_code in ( SELECT attribute_value::int4 FROM assort_smart.plan_attributes
														where plan_code = ' || $1 ||' and attribute_name =''cluster_plan_code'')
                           and is_final=' || $2 ||' group by attribute_name';

        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
