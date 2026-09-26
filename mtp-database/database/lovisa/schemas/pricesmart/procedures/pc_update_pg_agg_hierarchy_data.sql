--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pc_update_pg_agg_hierarchy_data_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pc_update_pg_agg_hierarchy_data_1

DROP PROCEDURE if exists pricesmart.pc_update_pg_agg_hierarchy_data;


CREATE OR REPLACE PROCEDURE pricesmart.pc_update_pg_agg_hierarchy_data(IN _pg_ids integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
AS $procedure$
DECLARE
    _pg_id int;
    agg_cols text;
    agg_select text;
    set_clause text;
    rec record;
BEGIN
    -- If _pg_ids is NULL or empty, populate it from tb_product_group
    IF _pg_ids IS NULL OR array_length(_pg_ids, 1) IS NULL THEN
        SELECT array_agg(pg_id)
        INTO _pg_ids
        FROM pricesmart.tb_product_group;
    END IF;

    -- Loop through each pg_id
    FOREACH _pg_id IN ARRAY _pg_ids
    LOOP
        agg_cols := 'pg_id';
        agg_select := format('%s AS pg_id', _pg_id);

        FOR rec IN
            SELECT id_mapping, request_key
            FROM pricesmart.pricesmart_hierarchy_mapping
            WHERE is_product_hierarchy = TRUE
            ORDER BY id_mapping
        LOOP
            agg_cols := agg_cols || ', ' || quote_ident(rec.request_key);
            agg_select := agg_select || format(
                ', (SELECT ARRAY_AGG(DISTINCT hierarchy_value) 
                   FROM pricesmart.tb_pg_hierarchy 
                   WHERE pg_id = %s AND hierarchy_level = %s) AS %I',
                _pg_id, rec.id_mapping, rec.request_key
            );
        END LOOP;

        -- Build SET clause for update
        SELECT string_agg(format('%I = src.%I', request_key, request_key), ', ')
        INTO set_clause
        FROM pricesmart.pricesmart_hierarchy_mapping
        WHERE is_product_hierarchy = TRUE;

        -- UPDATE if exists
        EXECUTE format(
            'UPDATE pricesmart.tb_pg_hierarchy_agg_data
             SET %s
             FROM (SELECT %s) AS src
             WHERE pricesmart.tb_pg_hierarchy_agg_data.pg_id = src.pg_id;',
            set_clause,
            agg_select
        );

        -- INSERT if missing
        EXECUTE format(
            'INSERT INTO pricesmart.tb_pg_hierarchy_agg_data (%s)
             SELECT %s
             WHERE NOT EXISTS (
                 SELECT 1 FROM pricesmart.tb_pg_hierarchy_agg_data
                 WHERE pg_id = %s
             );',
            agg_cols,
            agg_select,
            _pg_id
        );
    END LOOP;
END;
$procedure$
;
