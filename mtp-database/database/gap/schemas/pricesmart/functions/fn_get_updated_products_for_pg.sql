--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.fn_get_updated_products_for_pg_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.fn_get_updated_products_for_pg_1

DROP FUNCTION if exists pricesmart.fn_get_updated_products_for_pg;


CREATE OR REPLACE FUNCTION pricesmart.fn_get_updated_products_for_pg(_pg_id integer)
 RETURNS integer[]
 LANGUAGE plpgsql
AS $function$
DECLARE
    rec_json jsonb;
    mapp RECORD;
    dynamic_ids INTEGER[];
    product_ids INTEGER[];
    where_parts TEXT := '';
BEGIN
    -- Load the row as JSON (works for temp/permanent tables)
    SELECT to_jsonb(t)
    INTO rec_json
    FROM tb_refresh_temp_pg_actual_hierarchy t
    WHERE pg_id = _pg_id;

    IF rec_json IS NULL THEN
        RETURN NULL;
    END IF;

    -- Loop through mapping table
    FOR mapp IN
        SELECT request_key, id_column
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = TRUE
        ORDER BY id_mapping
    LOOP
        -- Extract only if the value is a JSON array
        dynamic_ids :=
        (
            SELECT ARRAY(
                SELECT elem::text::int
                FROM jsonb_array_elements(rec_json -> mapp.request_key) AS elem
                WHERE jsonb_typeof(rec_json -> mapp.request_key) = 'array'
            )
        );

        -- Add to WHERE clause only if valid array
        IF dynamic_ids IS NOT NULL AND array_length(dynamic_ids, 1) > 0 THEN
            where_parts := where_parts || format(' AND pm.%I = ANY (%L) ', mapp.id_column, dynamic_ids);
        END IF;
    END LOOP;

    -- No filters applied
    IF where_parts = '' THEN
        RETURN NULL;
    END IF;

    -- Execute final query
    EXECUTE format(
        '	SELECT 
				array_agg(DISTINCT pm.product_id)
         	FROM 
				pricesmart.product_master pm
         	WHERE 
				pm.is_active = 1 %s
		',
        where_parts
    ) INTO product_ids;

    RETURN product_ids;
END;
$function$
;
