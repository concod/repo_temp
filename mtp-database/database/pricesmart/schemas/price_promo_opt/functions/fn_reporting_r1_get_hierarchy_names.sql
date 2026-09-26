--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_reporting_r1_get_hierarchy_names runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_reporting_r1_get_hierarchy_names

DROP FUNCTION if exists price_promo_opt.fn_reporting_r1_get_hierarchy_names;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_reporting_r1_get_hierarchy_names(hierarchy_levels integer[], hierarchy_type integer, additional_columns text[], make_null boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    column_names TEXT := '';
    level_name INTEGER;
    overall_level_id INTEGER;
   col_name text := '';
BEGIN
    -- Check if -200 exists in hierarchy_levels, if so return an empty string

    select name from price_markdown.tb_view_by_config into overall_level_id
    where category = 'product_level'
    and display_name = 'Overall';

    IF overall_level_id = ANY(hierarchy_levels) THEN
        RETURN '';
    END IF;

    if make_null then
        FOREACH level_name IN ARRAY hierarchy_levels LOOP
            CASE hierarchy_type
                WHEN 1 THEN -- Product hierarchy
                    column_names := column_names || ', null::text as ' || 'l' || level_name || '_name ';
                        
                WHEN 2 THEN -- Store hierarchy
                            column_names := column_names || ', null::text as ' || 's' || level_name || '_name '; 
                
                ELSE
                    RAISE EXCEPTION 'Invalid hierarchy type: %', hierarchy_type;
            END CASE;
        END LOOP;
        
        IF additional_columns IS NOT NULL AND array_length(additional_columns, 1) > 0 THEN
            FOREACH col_name IN ARRAY additional_columns LOOP
            column_names := column_names || ', null::text as ' || col_name || ' ';
            end loop;
        END IF;
    else
        FOREACH level_name IN ARRAY hierarchy_levels LOOP
            CASE hierarchy_type
                WHEN 1 THEN -- Product hierarchy
                            column_names := column_names || ', ' || 'l' || level_name || '_name ';
                        
                WHEN 2 THEN -- Store hierarchy
                            column_names := column_names || ', ' || 's' || level_name || '_name '; 
                
                ELSE
                    RAISE EXCEPTION 'Invalid hierarchy type: %', hierarchy_type;
            END CASE;
        END LOOP;
        
        IF additional_columns IS NOT NULL AND array_length(additional_columns, 1) > 0 THEN
            FOREACH col_name IN ARRAY additional_columns LOOP
            column_names := column_names || ', ' || col_name || ' ';
            end loop;
        END IF;
    end if;
  
    RETURN TRIM(LEADING ', ' FROM column_names); -- Trim leading comma and space
END;
$function$



;