--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:insert_master_plan_with_output runOnChange:true stripComments:false splitStatements:false context:Release_tz labels:insert_master_plan_with_customised
--comment: changes for insert_master_plan_with_customised
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.insert_master_plan_with_output(p_start_date date, p_end_date date, p_channel character varying[], p_sub_channel character varying[], p_hierarchy_filter jsonb, p_status_str character varying, p_comment_str text, p_created_by_id integer, p_time_zone text);
CREATE OR REPLACE FUNCTION item_smart.insert_master_plan_with_output(p_start_date date, p_end_date date, p_channel character varying[], p_sub_channel character varying[], p_hierarchy_filter jsonb, p_status_str character varying, p_comment_str text, p_created_by_id integer, p_time_zone text DEFAULT 'UTC'::text)
 RETURNS TABLE(start_date date, end_date date, channel character varying[], sub_channel character varying[], hierarchy_filter jsonb)
 LANGUAGE plpgsql
AS $function$
DECLARE
    master_plan_attribute_id INTEGER;
    insert_query TEXT;
BEGIN
    -- Set the time zone
    RAISE NOTICE 'Setting time zone to: %', p_time_zone;
    EXECUTE format('SET TIME ZONE %L', p_time_zone);

    -- Build the INSERT query dynamically
    insert_query := 'INSERT INTO item_smart.master_plan_attributes (start_date, end_date, channel, hierarchy_filter';
    
    IF p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        insert_query := insert_query || ', sub_channel';
    END IF;

    insert_query := insert_query || ') VALUES ($1, $2, $3, $4';

    IF p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        insert_query := insert_query || ', $5';
    END IF;

    insert_query := insert_query || ') RETURNING master_plan_id';

    -- Debugging message for query
    RAISE NOTICE 'Executing query: %', insert_query;

    -- Execute INSERT and fetch master_plan_id
    IF p_sub_channel IS NOT NULL AND array_length(p_sub_channel, 1) > 0 THEN
        EXECUTE insert_query INTO master_plan_attribute_id USING p_start_date, p_end_date, p_channel, p_hierarchy_filter, p_sub_channel;
    ELSE
        EXECUTE insert_query INTO master_plan_attribute_id USING p_start_date, p_end_date, p_channel, p_hierarchy_filter;
    END IF;

    RAISE NOTICE 'Inserted into master_plan_attributes. Generated ID: %', master_plan_attribute_id;

    -- Insert into master_plan_status
    RAISE NOTICE 'Inserting into master_plan_status for ID: %', master_plan_attribute_id;
    INSERT INTO item_smart.master_plan_status (master_plan_attribute_id, status, created_on, created_by)
    VALUES (master_plan_attribute_id, p_status_str, NOW(), p_created_by_id);
    RAISE NOTICE 'Inserted into master_plan_status successfully.';

    -- Insert into master_plan_ledger
    RAISE NOTICE 'Inserting into master_plan_ledger for ID: %', master_plan_attribute_id;
    INSERT INTO item_smart.master_plan_ledger (master_plan_filters_id, status, comment, edited_on, edited_by)
    VALUES (master_plan_attribute_id, p_status_str, p_comment_str, NOW(), p_created_by_id);
    RAISE NOTICE 'Inserted into master_plan_ledger successfully.';

    -- **Fix: Explicitly return the required fields**
    RAISE NOTICE 'Fetching inserted record from master_plan_attributes for ID: %', master_plan_attribute_id;
    RETURN QUERY
    SELECT 
        mpa.start_date, 
        mpa.end_date, 
        mpa.channel, 
        COALESCE(mpa.sub_channel, ARRAY[]::VARCHAR[]), -- Ensure it returns an empty array if NULL
        mpa.hierarchy_filter
    FROM item_smart.master_plan_attributes AS mpa
    WHERE mpa.master_plan_id = master_plan_attribute_id;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error occurred: %', SQLERRM;
        ROLLBACK;
END;
$function$
;