--liquibase formatted sql
--changeset rahul.mishra@impactanalytics.co:store_status_list_signet_saf_only runOnChange:true stripComments:false splitStatements:false context:signet labels:store_access_hierarchy_fix
--comment: Signet-specific store_status_list - use store_attributes_filter as primary source (remove store_master JOIN)
--rollback: SELECT 1;

DROP FUNCTION IF EXISTS global.store_status_list(jsonb, jsonb, jsonb, jsonb);

CREATE OR REPLACE FUNCTION global.store_status_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(store_name character varying, store_code character varying, store_description text, active boolean, attributes json, status_obj json, updated_by text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_saf           TEXT := '';
    _query_table_filters TEXT := '';
    _query_combine       TEXT := '';
    _where_and_clause    TEXT := '';
    _where               TEXT := '';
    _where_saf           TEXT := '';
    __attribute_json_build_column_for_filter TEXT[] := array[]::TEXT[];
    _attr_cols           TEXT[] := array[]::TEXT[];
    _key TEXT;
    _value JSONB;
    _filter JSONB;
    _combined JSONB := '{}'::jsonb;
    _conditions TEXT[] := array[]::TEXT[];
    _list_values TEXT;
/*
 * Function/Procedure name: global.store_status_list
 *
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Akshay Jain    07-06-2022:    To accomodate fetching multiple status corresponding to one store as json object.
 *                               changes : 1. fetching all status for some store as jsonb array
 *                                         2. Added extra input param($4) which makes where clause to filter results
 *                                         3. changed return type of status to json and removed start-date and end-date
 * Akshay Jain    13-06-2022    Changed return column status to status_obj
 * Akshay Jain    04-08-2022    Changed start_time to status_start_time and end_time to status_end_time inside status object
 * Akshay Jain    22-08-2022    MIgrated to refcursor based SP
 * Akshay Jain    17-05-2023    updated_by, updated_at column handled using join with user_master table
 * Rahul Mishra   21-11-2025    Signet fix: Removed JOIN with store_master, query only store_attributes_filter
 *                              since it contains all required columns (store_name, store_description, active,
 *                              is_deleted, store_access_hierarchy and all attributes)
 */
BEGIN
    ---------------------------------------------------------------------
    -- Build JSON attributes from $2 ONLY (same as original SP)
    -- This ensures attributes JSON contains only $2 columns
    ---------------------------------------------------------------------
    FOR _key, _value IN SELECT * FROM jsonb_each($2) WHERE value IS NOT NULL LOOP
        CONTINUE WHEN _key = 'group';
        __attribute_json_build_column_for_filter :=
            array_append(array_append(__attribute_json_build_column_for_filter, '''' || _key || ''''),
                         'X.' || _key);
        _attr_cols := array_append(_attr_cols, _key);
    END LOOP;

    ---------------------------------------------------------------------
    -- Merge filters from $1 and $2 but skip empty filter keys
    -- for building WHERE clause
    ---------------------------------------------------------------------
    FOR _key, _value IN SELECT * FROM jsonb_each($1) LOOP
        IF jsonb_array_length(_value) > 0 THEN
            _combined := _combined || jsonb_build_object(_key, _value);
        END IF;
    END LOOP;

    FOR _key, _value IN SELECT * FROM jsonb_each($2) LOOP
        IF jsonb_array_length(_value) > 0 THEN
            _combined := _combined || jsonb_build_object(_key, _value);
        END IF;
    END LOOP;

    ---------------------------------------------------------------------
    -- Build WHERE conditions from combined filters
    ---------------------------------------------------------------------
    FOR _key, _value IN SELECT * FROM jsonb_each(_combined) LOOP
        CONTINUE WHEN _key = 'group';

        FOR _filter IN SELECT * FROM jsonb_array_elements(_value) LOOP
            IF (_filter->>'type') = 'list' THEN
                SELECT concat(array_agg(value)) INTO _list_values
                FROM json_array_elements_text(((_filter)->>'values')::json);

                IF _list_values IS NOT NULL AND _list_values != '' THEN
                    IF (_filter->>'operator') = 'in' THEN
                        _conditions := array_append(_conditions,
                            '(' || _key || '::varchar = any(''' || _list_values || '''::varchar[]))');
                    ELSE
                        _conditions := array_append(_conditions,
                            'NOT(' || _key || '::varchar = any(''' || _list_values || '''::varchar[]))');
                    END IF;
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    ---------------------------------------------------------------------
    -- Build WHERE clause for store_attributes_filter
    ---------------------------------------------------------------------
    IF cardinality(_conditions) > 0 THEN
        _where_saf := ' WHERE ' || array_to_string(_conditions, ' AND ');
    ELSE
        _where_saf := '';
    END IF;

    ---------------------------------------------------------------------
    -- Build the SAF query - SELECT specific columns to avoid ambiguity
    ---------------------------------------------------------------------
    _query_saf := 'SELECT store_name, store_code, store_description, active, ' ||
                  array_to_string(_attr_cols, ', ') ||
                  ' FROM global.store_attributes_filter' || _where_saf;

    _query_table_filters := global.form_table_query($3);
    _where_and_clause := global.form_where_clause('varchar', $4::jsonb);

    IF _where_and_clause = '' THEN
        _where := 'WHERE 1=1';
    ELSE
        _where := 'WHERE status IS NOT NULL';
    END IF;

    ---------------------------------------------------------------------
    -- Combine queries - output exactly 8 columns matching RETURNS TABLE
    ---------------------------------------------------------------------
    _query_combine := '
        SELECT
            X.store_name,
            X.store_code,
            X.store_description,
            X.active AS active,
            json_build_object(' || array_to_string(__attribute_json_build_column_for_filter, ',') || '),
            status_obj,
            X.updated_by,
            X.change_time
        FROM (
            SELECT
                saf.store_name,
                saf.store_code,
                saf.store_description,
                saf.active,
                ' || array_to_string(_attr_cols, ', ') || ',
                pta.status AS status_obj,
                pta.updated_by,
                pta.change_time
            FROM (' || _query_saf || ') saf
            LEFT JOIN (
                SELECT
                    store_code AS pta_store_code,
                    json_agg(
                        jsonb_build_object(
                            ''status_start_time'', concat(status_start_time)::varchar,
                            ''status_end_time'', concat(status_end_time)::varchar,
                            ''status'', status,
                            ''time_attr_id'', store_time_attr_id
                        )
                        ORDER BY status_start_time
                    ) AS status,
                    max(updated_by) AS updated_by,
                    max(change_time) AS change_time
                FROM (
                    SELECT
                        store_code,
                        start_time AS status_start_time,
                        end_time AS status_end_time,
                        attribute_value AS status,
                        store_time_attr_id,
                        um.name AS updated_by,
                        pg_xact_commit_timestamp(sta.xmin) AS change_time
                    FROM global.store_time_attributes sta
                    LEFT JOIN global.user_master um
                        ON sta.updated_by = um.user_code
                    WHERE attribute_name = ''status''
                ) a
                ' || _where_and_clause || '
                GROUP BY store_code
            ) pta
            ON saf.store_code = pta.pta_store_code
            ' || _where || '
        ) X
        ' || _query_table_filters || '
    ';

    RAISE NOTICE '%', _query_combine;

    RETURN QUERY EXECUTE _query_combine;
END;
$function$;
