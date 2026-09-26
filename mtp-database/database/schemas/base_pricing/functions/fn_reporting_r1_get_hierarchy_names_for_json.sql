--liquibase formatted sql
--changeset liquibase:fn_reporting_r1_get_hierarchy_names_for_json_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_reporting_r1_get_hierarchy_names_for_json_1
--rollback: SELECT 1


-- DROP FUNCTION base_pricing.fn_reporting_r1_get_hierarchy_names_for_json(int4);
DROP FUNCTION if exists base_pricing.fn_reporting_r1_get_hierarchy_names_for_json();

CREATE OR REPLACE FUNCTION base_pricing.fn_reporting_r1_get_hierarchy_names_for_json(hierarchy_levels integer[], hierarchy_type integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    column_names TEXT := '';
    level_name INTEGER;
BEGIN
    -- Check if -200 exists in hierarchy_levels, if so return an empty string
    IF -200 = ANY(hierarchy_levels) THEN
        RETURN '';
    END IF;

   	
	FOREACH level_name IN ARRAY hierarchy_levels LOOP
        CASE hierarchy_type
            WHEN 1 THEN -- Product hierarchy
            	case 
	            	when level_name = 0 then 
	            		column_names := column_names || ' ''Division'', l0_name, ';
	            	when level_name = 1 then 
	            		column_names := column_names || ' ''Dept'', l1_name, ';
	            	when level_name = 2 then 
	            		column_names := column_names || ' ''DMM'', l2_name, ';
	            	when level_name = 3 then 
	            		column_names := column_names || ' ''Class'', l3_name, ';
	            	when level_name = 4 then 
	            		column_names := column_names || ' ''Sub Class'', l4_name, ';
            	end case;
            WHEN 2 THEN -- Store hierarchy
            	case 
	            	when level_name = 0 then 
                		column_names := column_names || ' ''Country'', s0_name, '; 
                	when level_name = 1 then 
                		column_names := column_names || ' ''Channel'', s1_name, ';
                end case;
            ELSE
                RAISE EXCEPTION 'Invalid hierarchy type: %', hierarchy_type;
        END CASE;
	END LOOP;
	
	if hierarchy_type = 1 then
		column_names := column_names || ' ''FOB'', fob, '; -- Adjust column prefix based on actual schema
	end if;
   	
    RETURN TRIM(LEADING ', ' FROM column_names); -- Trim leading comma and space
END;
$function$
;
