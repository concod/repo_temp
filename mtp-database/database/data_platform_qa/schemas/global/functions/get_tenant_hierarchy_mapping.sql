--liquibase formatted sql
--changeset liquibase:update_tenant_hierarchy_mapping_chk runOnChange:true stripComments:false splitStatements:false context:MTP-58176 labels:liquibase_project_start
--comment: MTP-58176: Updated the SP to include the cascade filters for levels and verify chk.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.get_tenant_hierarchy_mapping(input integer, text, text[]);
CREATE OR REPLACE FUNCTION global.get_tenant_hierarchy_mapping(input integer, text, text[])
 RETURNS TABLE(application_code integer, attribute_type character varying, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
     /*
     Function/Procedure name: global.get_tenant_hierarchy_mapping
     Created by: Hemant Kumar Singh
     Created at: 30-May-2022
     Updated by: Hemanth C S
     Updated at: 26-September-2024
     No of input parameter: 3
     Parameter Description : $1 = Plan code, $2 = description, $3 = attributes list

     Purpose: This function has been created to get tenant hierarchy mapping levels 

     Calling Statement:
     SELECT global.get_tenant_hierarchy_mapping(287, 'product_indicator', '{"l0_name", "age", "gender"}');
     
     Hemant Kumar Singh: getting tenant hierarchy mapping levels 
     */
DECLARE
    _query_combine text;
    _levels_list text;  -- Variable to hold the converted levels list
BEGIN
    -- Convert the array to a comma-separated string
    _levels_list := array_to_string(ARRAY(SELECT quote_literal(attr) FROM unnest($3::text[]) AS attr), ',');


    _query_combine := 'WITH RECURSIVE filter_cte AS 
                        (    
                            SELECT b.hierarchy_level, b.hierarchy_value, a.rnk, b.hierarchy_level_id, -1 AS chk 
                            FROM t1 AS a
                            JOIN t2 AS b USING(hierarchy_level, hierarchy_value)
                            WHERE a.rnk = (SELECT MIN(rnk) FROM t1)
                            UNION ALL 
                            (
                                SELECT b.hierarchy_level, b.hierarchy_value, a.rnk, b.hierarchy_level_id, c.hierarchy_level_id AS chk
                                FROM filter_cte AS c
                                JOIN t1 AS a ON a.rnk = (SELECT MIN(rnk) FROM t1 WHERE rnk > c.rnk) 
                                JOIN t2 AS b ON a.hierarchy_value = b.hierarchy_value AND a.hierarchy_level = b.hierarchy_level
                                AND b.hierarchy_level_id = c.hierarchy_level_id
                            ) 
                        ),
                        t1 AS
                        (
                            SELECT  a.attribute_name AS hierarchy_level,
                                    TRIM(REGEXP_SPLIT_TO_TABLE(REPLACE(TRIM(BOTH ''{}'' FROM attribute_value), ''"'', ''''), '',''), '' '') AS hierarchy_value, rnk
                            FROM cluster_smart.cluster_plan_attributes AS a
                            JOIN
                            (
                                SELECT DISTINCT generic_column_name AS attribute_name, hierarchy_level, RANK() OVER(ORDER BY hierarchy_level) AS rnk 
                                FROM global.product_generic_schema_mapping pgsm 
                                WHERE generic_column_name IN (' || _levels_list || ')
                            ) AS b USING(attribute_name)
                            WHERE cluster_plan_code = ' || $1 || '
                            ORDER BY LEFT(attribute_name, 2) DESC
                        ),
                        t2 AS 
                        (
                            SELECT hierarchy_level_id, a.hierarchy_level, hierarchy_value, rnk 
                            FROM "global".tenant_hierarchy_levels AS a
                            JOIN
                            (
                                SELECT DISTINCT generic_column_name AS hierarchy_level, RANK() OVER(ORDER BY hierarchy_level) AS rnk 
                                FROM global.product_generic_schema_mapping pgsm 
                                WHERE generic_column_name IN (' || _levels_list || ')
                            ) AS b USING(hierarchy_level)
                        )
                        SELECT 
                            thm.application_code,
                            thm.description AS attribute_type,
                            JSONB_OBJECT_AGG(thm.attribute_type, thm.attribute_value) AS attribute_value
                        FROM "global".tenant_hierarchy_mapping thm
                        JOIN filter_cte USING(hierarchy_level_id)
                        WHERE thm.description = ''' || $2 || '''
                        GROUP BY 1, 2';

    RAISE NOTICE '%', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
END
$function$
;