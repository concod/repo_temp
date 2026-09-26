--liquibase formatted sql
--changeset IshanDwivedi:store_status_list_v1 runOnChange:true stripComments:false splitStatements:false context:store_status_list labels:MTP-65431
--comment: MTP-65431
--rollback: SELECT 1


DROP FUNCTION if exists "global".store_status_list(input jsonb, jsonb, jsonb, jsonb);



CREATE OR REPLACE FUNCTION global.store_status_list(input jsonb, jsonb, jsonb, jsonb)
 RETURNS TABLE(store_name character varying, store_code character varying, store_description text, active boolean, attributes json, store_type character varying, status_obj json, updated_by text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query_sm text := '';
    _query_sa text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _where_and_clause text := '';
    _where text := '';
    _final_query text := '';
    __attribute_json_build_column_for_filter text[] := array[]::text[];
    _key text;
    _value text;
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
   */
BEGIN
    FOR _key, _value IN 
        SELECT * FROM jsonb_each_text($2) WHERE value IS NOT NULL 
    LOOP
        CONTINUE WHEN _key = 'group' OR _key = 'store_type';
        __attribute_json_build_column_for_filter := array_append(
            array_append(__attribute_json_build_column_for_filter, '''' || _key || ''''),
            'X.' || _key || ''
        );
    END LOOP;

    _query_sm := 'SELECT store_code, channel, region_name, store_type FROM "global".store_attributes_filter' 
                 || (global.form_main_table_filters('store_master', $1));
    _query_sa := global.form_attribute_table_filters_v2('store_attributes', 'store_code', $2);
    _query_table_filters := global.form_table_query($3);
    _where_and_clause := global.form_where_clause('varchar', $4::jsonb);

    IF _where_and_clause::text = '' THEN 
        _where := 'WHERE 1=1'; 
    ELSE
        _where := 'WHERE status IS NOT NULL';
    END IF;

    _query_combine := '
        SELECT
            X.store_name,
            X.store_code,
            X.store_description,
            X.active AS active,
            json_build_object(
                ''channel'', X.channel,
                ''region_name'', X.region_name
            ) AS attributes,
            X.store_type, -- Including store_type as a separate column
            status_obj,
            X.updated_by,
            X.change_time
        FROM (
            SELECT
                sm.*,
                pta.status AS status_obj,
                pta.updated_by,
                pta.change_time
            FROM (
                SELECT
                    main.store_name,
                    main.store_description,
                    main.active AS active,
                    attributes.*
                FROM (
                    SELECT * FROM global.store_master
                ) main
                JOIN (' || _query_sa || ') attributes 
                ON main.store_code = attributes.store_code
            ) sm
            LEFT JOIN (
                SELECT
                    store_code,
                    json_agg(
                        jsonb_build_object(
                            ''status_start_time'', CONCAT(status_start_time)::varchar,
                            ''status_end_time'', CONCAT(status_end_time)::varchar,
                            ''status'', status,
                            ''time_attr_id'', store_time_attr_id
                        ) ORDER BY status_start_time
                    ) AS status,
                    MAX(updated_by) AS updated_by,
                    MAX(change_time) AS change_time
                FROM (
                    SELECT
                        store_code,
                        start_time AS status_start_time,
                        end_time AS status_end_time,
                        attribute_value AS status,
                        store_time_attr_id,
                        um.name AS updated_by,
                        pg_xact_commit_timestamp(sta.xmin) AS change_time
                    FROM 
                        "global".store_time_attributes sta
                    LEFT JOIN "global".user_master um 
                    ON sta.updated_by = um.user_code
                    WHERE attribute_name = ''status''
                ) a
                ' || _where_and_clause || '
                GROUP BY store_code
            ) pta
            ON sm.store_code = pta.store_code 
            ' || _where || '
        ) X ' || _query_table_filters;

    RAISE NOTICE '%', _query_combine;
    RETURN QUERY EXECUTE _query_combine;
END;
$function$;