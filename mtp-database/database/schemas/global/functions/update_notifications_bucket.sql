--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:update_notifications_bucket,MTP-74252 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:MTP-74252
--comment: initial changeset for update_notifications_bucket
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".update_notifications_bucket(user_id integer, bucket_name text, no_codes integer[]);
CREATE OR REPLACE FUNCTION global.update_notifications_bucket(user_id integer, bucket_name text, no_codes integer[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query TEXT;
BEGIN
    _query := 'UPDATE "global".notifications_master 
               SET 
                   bucket_name = ''' || bucket_name || ''',
                   updated_at = now(),
                   updated_by = ' || user_id ;

    -- If bucket_name is 'Completed', set bookmarked = FALSE
    IF bucket_name = 'Completed' THEN
        _query := _query || ', bookmarked = FALSE';
    END IF;

	_query := _query || ' WHERE created_for = ' || user_id || ' AND no_code = ANY($1);';
	Raise notice 'Query %', _query;

    EXECUTE _query using no_codes;
END
$function$
;
