--liquibase formatted sql
--changeset jitendra.singh:product_supersession_check_relations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_supersession_check_relations
--rollback: SELECT 1
--function to check if given dates are valid for supersession;
DROP FUNCTION IF EXISTS inventory_smart.product_supersession_check_relations(json);
CREATE OR REPLACE FUNCTION inventory_smart.product_supersession_check_relations(relations json)
 RETURNS TABLE(invalid_old_articles text[], invalid_new_articles text[])
 LANGUAGE plpgsql
AS $function$
DECLARE
    r_new_article text;
    r_old_article text;
    r_start_date date;
    r_end_date date;
    rel_data json;
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
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
            SELECT count(*)>0 FROM inventory_smart.product_supersession_mapping psm
            WHERE (old_article = r_old_article OR article = r_old_article)
            AND start_date BETWEEN r_start_date AND r_end_date
        ) THEN
            invalid_old_articles := array_append(invalid_old_articles, r_old_article);
        END IF;

        IF  (
            SELECT count(*)>0 FROM inventory_smart.product_supersession_mapping
            WHERE (old_article = r_new_article OR article = r_new_article)
            AND start_date BETWEEN r_start_date AND r_end_date
        ) THEN
            invalid_new_articles := array_append(invalid_new_articles, r_new_article);
        END IF;
    END LOOP;
   	
       RAISE NOTICE 'Invalid Old Articles: %', invalid_old_articles;

    return query select invalid_old_articles,invalid_new_articles;
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.product_supersession_check_relations', 'Before returning function value',null,relations) ;		

END;
$function$
;
