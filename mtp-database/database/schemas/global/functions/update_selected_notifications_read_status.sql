--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:update_selected_notifications_read_status runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74252
--comment: initial changeset for update_selected_notifications_read_status
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".update_selected_notifications_read_status(user_id integer, status integer, no_codes integer[]);
CREATE OR REPLACE FUNCTION global.update_selected_notifications_read_status(user_id integer, status integer DEFAULT 1, no_codes integer[] DEFAULT '{}'::integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query TEXT;
BEGIN
    _query := 'UPDATE "global".notifications_master 
               SET 
                   status = ' || $2 || ',
                   updated_at = now(),
                   updated_by = ' || $1 || '
               WHERE created_for = ' || $1;

    -- If the list is not empty, apply filtering condition
    IF array_length(no_codes, 1) IS NOT NULL AND array_length(no_codes, 1) > 0 THEN
        _query := _query || ' AND no_code = ANY($3)';
    END IF;

    _query := _query || ';';

    EXECUTE _query using user_id, status, no_codes;
END
$function$
;
