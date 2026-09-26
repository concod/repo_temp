--liquibase formatted sql
--changeset liquibase:changes_for_tenant_hierarchy_mapping_for_priority_levels runOnChange:true stripComments:false splitStatements:false context:MTP-84180 labels:changes_for_tenant_hierarchy_mapping
--comment: MTP-84180: changes for the SP to include the store and product levels in the hierarchy mapping.
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
     Updated at: 30-April-2025
     No of input parameter: 3
     Parameter Description : $1 = Plan code, $2 = description, $3 = attributes list

     Purpose: This function has been created to get tenant hierarchy mapping levels 

     Calling Statement:
     SELECT global.get_tenant_hierarchy_mapping(287, 'product_indicator', '{"l0_name", "age", "gender"}');
     
     Hemant Kumar Singh: getting tenant hierarchy mapping levels 
     Hemanth C S: Added level tracking to ensure only records that reached the deepest level are included,
                  with a maximum depth based on the number of attributes provided
     */
DECLARE
    _query_combine text;
    _levels_list text;  -- Variable to hold the converted levels list
    _max_expected_level integer;  -- Maximum expected level based on input array length
	_chk_condition text;
BEGIN
    -- Convert the array to a comma-separated string
    _levels_list := array_to_string(ARRAY(SELECT quote_literal(attr) FROM unnest($3::text[]) AS attr), ',');
    
    -- Set the maximum expected level based on the number of attributes provided
    _max_expected_level := array_length($3, 1);

	-- Set the check condition based on max expected level
    IF _max_expected_level = 1 THEN
        _chk_condition := '';
    ELSE
        _chk_condition := 'AND chk >= 0';
    END IF;

    _query_combine := 'WITH RECURSIVE filter_cte AS 
                        (    
                            SELECT b.hierarchy_level, b.hierarchy_value, a.rnk, b.hierarchy_level_id, -1 AS chk, a.rnk AS level_reached
                            FROM t1 AS a
                            JOIN t2 AS b USING(hierarchy_level, hierarchy_value)
                            WHERE a.rnk = (SELECT MIN(rnk) FROM t1)
                            UNION ALL 
                            (
                                SELECT b.hierarchy_level, b.hierarchy_value, a.rnk, b.hierarchy_level_id, c.hierarchy_level_id AS chk, a.rnk AS level_reached
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
                            (   select attribute_name, hierarchy_level, RANK() OVER(ORDER BY hierarchy_level) AS rnk
                                from
                                (SELECT DISTINCT generic_column_name AS attribute_name, hierarchy_level 
                                FROM global.store_generic_schema_mapping pgsm 
                                WHERE generic_column_name IN (' || _levels_list || ')     
                                
                                union 
                                
                                SELECT DISTINCT generic_column_name AS attribute_name, hierarchy_level + 10
                                FROM global.product_generic_schema_mapping pgsm 
                                WHERE generic_column_name IN (' || _levels_list || '))a
                            ) AS b USING(attribute_name)
                            WHERE cluster_plan_code = ' || $1 || '
                            ORDER BY LEFT(attribute_name, 2) DESC
                        ),
                        t2 AS 
                        (
                            SELECT hierarchy_level_id, a.hierarchy_level, hierarchy_value, rnk 
                            FROM "global".tenant_hierarchy_levels AS a
                            JOIN
                            (select hierarchy_level, rnk + 10 as rnk
                                from
                                (SELECT DISTINCT generic_column_name AS hierarchy_level, RANK() OVER(ORDER BY hierarchy_level) AS rnk
                                FROM global.product_generic_schema_mapping pgsm 
                                WHERE generic_column_name IN (' || _levels_list || '))a
                                union
                                SELECT DISTINCT generic_column_name AS hierarchy_level, RANK() OVER(ORDER BY hierarchy_level) AS rnk 
                                FROM global.store_generic_schema_mapping pgsm 
                                WHERE generic_column_name IN (' || _levels_list || ')) AS b USING(hierarchy_level)
                        ),
                        -- Get the maximum level for each hierarchy_level_id
                        max_levels AS (
                            SELECT hierarchy_level_id, MAX(level_reached) AS max_level_reached
                            FROM filter_cte
                            GROUP BY hierarchy_level_id
                        ),
                        -- Get the maximum level across all records, limited by expected max level
                        max_overall_level AS (
                            SELECT LEAST(MAX(level_reached), ' || _max_expected_level || ') AS deepest_level
                            FROM filter_cte
                        )
                        SELECT 
                            thm.application_code,
                            thm.description AS attribute_type,
                            JSONB_OBJECT_AGG(thm.attribute_type, thm.attribute_value) AS attribute_value
                        FROM "global".tenant_hierarchy_mapping thm
                        JOIN filter_cte fc USING(hierarchy_level_id)
                        JOIN max_levels ml ON fc.hierarchy_level_id = ml.hierarchy_level_id
                        CROSS JOIN max_overall_level mol
                        WHERE thm.description = ''' || $2 || ''' 
                          ' || _chk_condition || ' 
                          AND is_Active is true
                          AND ml.max_level_reached = mol.deepest_level  -- Only include records that reached the deepest level
                        GROUP BY 1, 2';
	RAISE NOTICE '%', _max_expected_level;
    RAISE NOTICE '%', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
END
$function$
;