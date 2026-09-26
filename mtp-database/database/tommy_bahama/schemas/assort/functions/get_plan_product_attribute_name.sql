--liquibase formatted sql
--changeset sadhana.j:MTP_43659_levels runOnChange:true stripComments:false splitStatements:false context:MTP-43659-levels labels:liquibase_project_start
--comment: MTP-43659-levels
--rollback: SELECT 1

DROP FUNCTION IF EXISTS assort.get_plan_product_attribute_name(input integer);

DROP FUNCTION IF EXISTS assort.get_plan_product_attribute_name(input integer, boolean);

CREATE OR REPLACE FUNCTION assort.get_plan_product_attribute_name(input integer, boolean DEFAULT true)
 RETURNS TABLE(attribute_name character varying)
 LANGUAGE plpgsql
AS $function$
declare
_query_combine text;

    begin
	    /*
            Function/Procedure name: assort.get_plan_product_attribute_name
            Created by: Sadhana J
            Created at: 09-Mar-2022
            No of input parameter: 1
            Parameter Description : $1 = jsonb attribute details

            Purpose: This function been created to get plan-attribute if is_final true

            Calling Statement:

            select * from assort.get_plan_product_attribute_name(30);

            Updated_by Updated_on Purpose
            Sadhana J 09-03-2022: to get plan-attribute
            */

     _query_combine := 'SELECT attribute_name
							FROM cluster_smart.plan_product_attributes
							where cluster_plan_code in ( SELECT attribute_value::int4 FROM assort.plan_attributes
														where plan_code = ' || $1 ||' and attribute_name =''cluster_plan_code'')
                           and is_final=' || $2 ||'
                            and attribute_name not in (''Subcat'', ''subcat'', ''size_curve'', ''size'', ''l3_name'', ''l0_name'', ''l1_name'', ''l2_name'')
                            group by attribute_name';

        raise notice '%', _query_combine;
        return QUERY execute _query_combine;

    end
$function$
;
