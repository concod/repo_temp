--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:fn_get_hierarchy_column_names runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_get_hierarchy_column_names

DROP FUNCTION if exists price_promo_opt.fn_get_hierarchy_column_names;
CREATE OR REPLACE FUNCTION price_promo_opt.fn_get_hierarchy_column_names(hierarchy_levels integer[], hierarchy_type integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$

DECLARE

    column_names TEXT;

BEGIN

    -- Your logic to generate column names based on hierarchy_levels and hierarchy_type

    -- Example logic:

    IF hierarchy_type = 1 THEN

        -- Generate product hierarchy column names

        column_names := 'l' || hierarchy_levels[1] || '_name, l' || hierarchy_levels[2] || '_name';

    ELSIF hierarchy_type = 2 THEN

        -- Generate store hierarchy column names

        column_names := 's' || hierarchy_levels[1] || '_name, s' || hierarchy_levels[2] || '_name';

    ELSE

        RAISE EXCEPTION 'Invalid hierarchy type';

    END IF;

    

    RETURN column_names;

END;

$function$
;

