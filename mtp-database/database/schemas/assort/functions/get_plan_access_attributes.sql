--liquibase formatted sql
--changeset liquibase:get_plan_access_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_plan_access_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_plan_access_attributes (input character varying []);
CREATE OR REPLACE FUNCTION assort.get_plan_access_attributes (input character varying [])
RETURNS TABLE (plan_code integer, attributes jsonb)
LANGUAGE plpgsql
AS $function$

/*
  Returns plan access attributes - hierarchy , channel for user access validation
    created: Pradeep Nayak
    created on : 31-Mar-2022
*/
declare
    _query text := '';
begin
    _query :=  'SELECT
      plan_code,
      jsonb_object_agg(key,
        value ) AS attributes
    FROM (
      SELECT
        plan_code,
        jsonb_object_agg(''channel'',
          channel) AS attributes
      FROM
        assort.plan_master
      WHERE
        plan_code = any('''||concat($1)||''')
      GROUP BY
        plan_code UNION
      SELECT
        plan_code,
        jsonb_object_agg(attribute_name,
          attribute_value::varchar[]) AS attributes
      FROM
        assort.plan_attributes pa
      WHERE
        plan_code = any('''||concat($1)||''')
        AND attribute_name ~ ''^l[0-9]_name$''
      GROUP BY
        plan_code ) pmain,
      jsonb_each(attributes)
    GROUP BY
      pmain.plan_code;';
	RETURN QUERY execute _query;
end
$function$
;