--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:retrieve_buckets_and_filters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74252
--comment: initial changeset for retrieve_buckets_and_filters
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".retrieve_buckets_and_filters(input refcursor, user_id integer, app_code integer);
CREATE OR REPLACE FUNCTION global.retrieve_buckets_and_filters(input refcursor, user_id integer, app_code integer)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
    
BEGIN
	OPEN input FOR
    
    SELECT jsonb_build_object(
               min(abm.special_classification), 
               array_agg(jsonb_build_object( 
                   'bucket_name', abm.bucket_name,
				   'notifications_count', (
                       SELECT COUNT(no_code)
                       FROM global.notifications_master nm
                       WHERE nm.application_code = app_code 
                           AND nm.special_classification = abm.special_classification
						   AND (nm.bucket_name = abm.bucket_name OR
							   CASE -- for Bookmarked bucket nm.bucket_name = 'Bookmarked'
								   WHEN abm.bucket_name = 'Bookmarked' THEN nm.bookmarked
								   ELSE False
								END)
						   AND ((nm.is_deleted = false and abm.bucket_name != 'Archived')
								OR
								(nm.is_deleted = true and abm.bucket_name = 'Archived'))	
						   AND nm.created_for = user_id
                   )
               ) order by abm.bucket_order
			)
           ) as data
    FROM global.app_bucket_mapping abm
    WHERE abm.application_code = app_code
    GROUP BY abm.special_classification
	
	union all

	SELECT jsonb_build_object('filters', array_agg(DISTINCT tag)) as data
	FROM (
	    SELECT DISTINCT jsonb_array_elements_text(filter_tags) AS tag 
	    FROM global.notifications_master WHERE application_code = app_code
	) AS distinct_tags;
	
	return input;
	
END;
$function$
;
