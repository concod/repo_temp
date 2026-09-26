--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:fn_get_updated_stores_for_event runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_get_updated_stores_for_event

DROP FUNCTION IF EXISTS price_promo.fn_get_updated_stores;

CREATE OR REPLACE FUNCTION price_promo.fn_get_updated_stores(_id integer)
RETURNS integer[]
LANGUAGE plpgsql
AS $function$
DECLARE
    rec_json jsonb;
    mapp RECORD;
    dynamic_ids INTEGER[];
    store_ids INTEGER[];
    where_parts TEXT := '';
BEGIN
    -- Load the row as JSON from the temp table
    SELECT to_jsonb(t)
    INTO rec_json
    FROM tb_refresh_temp_store_actual_hierarchy t
    WHERE entity_id = _id;

    IF rec_json IS NULL THEN
        RETURN NULL;
    END IF;

    -- Loop through store hierarchy mapping table
    FOR mapp IN
        SELECT request_key, id_column
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = FALSE
        ORDER BY id_mapping
    LOOP
        -- Extract only if the value is a JSON array
        dynamic_ids := (
            SELECT ARRAY(
                SELECT elem::text::int
                FROM jsonb_array_elements(rec_json -> mapp.request_key) AS elem
                WHERE jsonb_typeof(rec_json -> mapp.request_key) = 'array'
            )
        );

        -- Add to WHERE clause only if valid array
        IF dynamic_ids IS NOT NULL AND array_length(dynamic_ids, 1) > 0 THEN
            where_parts := where_parts || format(' AND sm.%I = ANY (%L) ', mapp.id_column, dynamic_ids);
        END IF;
    END LOOP;

    -- No filters applied
    IF where_parts = '' THEN
        RETURN NULL;
    END IF;

    -- Execute final query against store_master
    EXECUTE format(
        'SELECT array_agg(DISTINCT sm.store_id)
         FROM pricesmart.tb_store_master sm
         WHERE sm.is_active = 1 %s',
        where_parts
    ) INTO store_ids;

    RETURN store_ids;
END;
$function$;
