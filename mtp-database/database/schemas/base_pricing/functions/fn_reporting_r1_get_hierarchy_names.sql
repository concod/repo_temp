--liquibase formatted sql
--changeset liquibase:fn_reporting_r1_get_hierarchy_names_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_reporting_r1_get_hierarchy_names_1
--rollback: SELECT 1


-- DROP FUNCTION base_pricing.fn_reporting_r1_get_hierarchy_names(int4);
DROP FUNCTION if exists base_pricing.fn_reporting_r1_get_hierarchy_names();

CREATE OR REPLACE FUNCTION base_pricing.fn_reporting_r1_get_hierarchy_names(hierarchy_levels integer[], hierarchy_type integer, make_null boolean DEFAULT false)
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

   	if make_null then
   		FOREACH level_name IN ARRAY hierarchy_levels LOOP
	        CASE hierarchy_type
	            WHEN 1 THEN -- Product hierarchy
	            	case 
		            	when level_name = 0 then 
		            		column_names := column_names || ', null::text as l0_name ';
		            	when level_name = 1 then 
		            		column_names := column_names || ', null::text as l1_name ';
		            	when level_name = 2 then 
		            		column_names := column_names || ', null::text as l2_name ';
		            	when level_name = 3 then 
		            		column_names := column_names || ', null::text as l3_name ';
		            	when level_name = 4 then 
		            		column_names := column_names || ', null::text as l4_name ';
	            	end case;
	            WHEN 2 THEN -- Store hierarchy
	            	case 
		            	when level_name = 0 then 
	                		column_names := column_names || ', null::text as s0_name '; 
	                	when level_name = 1 then 
	                		column_names := column_names || ', null::text as s1_name ';
	                	when level_name = 2 then 
	                		column_names := column_names || ', null::text as s2_name ';
	                end case;
	            ELSE
	                RAISE EXCEPTION 'Invalid hierarchy type: %', hierarchy_type;
	        END CASE;
    	END LOOP;
    	
    	if hierarchy_type = 1 then
   			column_names := column_names || ', null::text as fob '; -- Adjust column prefix based on actual schema
   		end if;
   	else
   		FOREACH level_name IN ARRAY hierarchy_levels LOOP
	        CASE hierarchy_type
	            WHEN 1 THEN -- Product hierarchy
	            	case 
		            	when level_name = 0 then 
	                		column_names := column_names || ', ' || 'l' || level_name || '_name ';
	                	when level_name = 1 then 
	                		column_names := column_names || ', ' || 'l' || level_name || '_name ';
	                	when level_name = 2 then 
	                		column_names := column_names || ', ' || 'l' || level_name || '_name ';
	                	when level_name = 3 then 
	                		column_names := column_names || ', ' || 'l' || level_name || '_name ';
	                	when level_name = 4 then 
	                		column_names := column_names || ', ' || 'l' || level_name || '_name ';
	                end case;
	            WHEN 2 THEN -- Store hierarchy
	           		case 
		           		when level_name = 0 then 
	                		column_names := column_names || ', ' || 's' || level_name || '_name '; 
	                	when level_name = 1 then 
	                		column_names := column_names || ', ' || 's' || level_name || '_name '; 
	                	when level_name = 2 then 
	                		column_names := column_names || ', ' || 's' || level_name || '_name '; 
	                end case;
	            ELSE
	                RAISE EXCEPTION 'Invalid hierarchy type: %', hierarchy_type;
	        END CASE;
    	END LOOP;
    	
    	if hierarchy_type = 1 then
   			column_names := column_names || ', fob ' ; -- Adjust column prefix based on actual schema
   		end if;
   	end if;
 
   	
   	
    

    RETURN TRIM(LEADING ', ' FROM column_names); -- Trim leading comma and space
END;
$function$
;
