--liquibase formatted sql
--changeset liquibase:check_relations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for check_relations
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.check_relations(relations json);

CREATE OR REPLACE FUNCTION inventory_smart.check_relations(relations json)
 RETURNS TABLE(invalid_old_articles text[], invalid_new_articles text[])
 LANGUAGE plpgsql
AS $function$
DECLARE
    r_new_article text;
    r_old_article text;
    r_start_date date;
    r_end_date date;
    rel_data json;
BEGIN
    invalid_old_articles := '{}';
    invalid_new_articles := '{}';
   
    FOR rel_data IN SELECT * FROM json_array_elements($1)
    LOOP
        r_new_article := rel_data->>'new_article';
        r_old_article := rel_data->>'old_article';
        r_start_date := (rel_data->>'start_date')::date;
        r_end_date := (rel_data->>'end_date')::date;
        
        IF  (
            SELECT count(*)>0 FROM inventory_smart.style_mapping_table
            WHERE (old_article = r_old_article OR new_article = r_old_article)
            AND start_date BETWEEN r_start_date AND r_end_date
        ) THEN
            invalid_old_articles := array_append(invalid_old_articles, r_old_article);
        END IF;
        IF  (
            SELECT count(*)>0 FROM inventory_smart.style_mapping_table
            WHERE (old_article = r_new_article OR new_article = r_new_article)
            AND start_date BETWEEN r_start_date AND r_end_date
        ) THEN
            invalid_new_articles := array_append(invalid_new_articles, r_new_article);
        END IF;
    END LOOP;
   	
       RAISE NOTICE 'Invalid Old Articles: %', invalid_old_articles;
    -- Return the arrays
    --return ;
    return query select invalid_old_articles,invalid_new_articles;
END;
$function$
;
