--liquibase formatted sql
--changeset akshay.jain@impactanalytics.co:retrieve_notifications_by_bucket_bug_fix runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:Order-by-not
--comment: Added order by desc on notfications fetch
--rollback: SELECT 1
DROP FUNCTION IF EXISTS "global".retrieve_notifications_by_bucket(input refcursor, params jsonb);
CREATE OR REPLACE FUNCTION global.retrieve_notifications_by_bucket(input refcursor, params jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
    _bucket_name text;
    _app_code int;
    _filter text[];
    _special_classification text;
    _user_code int;
    _active_minutes int;
	_urgent_threshold timestamptz;
	_urgent boolean;
	_fast_approaching_range jsonb;
	_fast_approaching boolean;
BEGIN
    -- Extract values from JSONB input
    _bucket_name := params->>'bucket_name';
    _app_code := (params->>'app_code')::int;
    --_filter := ARRAY(SELECT jsonb_array_elements_text(params->'filter'));
	IF jsonb_typeof(params->'filter') = 'array' THEN
    	_filter := ARRAY(SELECT jsonb_array_elements_text(params->'filter'));
	ELSE
    	_filter := ARRAY[]::text[];
	END IF;

	RAISE NOTICE '_filter: %', _filter;
    _special_classification := params->>'special_class';
    _user_code := (params->>'user_code')::int;

    -- Fetch active_minutes if the bucket is 'New' or 'Pending'
    IF _bucket_name = 'New' OR _bucket_name = 'Pending' THEN
        SELECT COALESCE((settings->>'active_minutes')::int, 0) 
        INTO _active_minutes  
        FROM global.user_notification_settings 
        WHERE user_code = _user_code  -- Fixed condition
		UNION ALL
		SELECT 5
		WHERE NOT EXISTS (
		  SELECT 1
		  FROM global.user_notification_settings
		  WHERE user_code = _user_code
		)
		LIMIT 1;


        RAISE NOTICE 'Active minutes: %', _active_minutes;

        -- Update bucket from active to pending
        UPDATE global.notifications_master 
        SET bucket_name = 'Pending' 
        WHERE bucket_name = 'New' 
		AND created_for = _user_code
        AND created_at < NOW() - INTERVAL '1 minute' * _active_minutes;
    END IF;

	-- retrieve user's settings
	SELECT (settings->>'urgency_threshold')::timestamptz, (settings->>'fast_approaching')::jsonb
	INTO _urgent_threshold, _fast_approaching_range
	FROM global.user_notification_settings
	WHERE user_code = _user_code;

	RAISE NOTICE 'urgent: %', _urgent_threshold;
	RAISE NOTICE 'fast approaching: %', _fast_approaching_range::text;

    -- Open the refcursor and execute the query
    OPEN input FOR 
    SELECT nm.no_code, nm.special_classification, nm.subject, nm.description, nm.status,
    nm.bookmarked, 
	CASE WHEN _urgent_threshold IS NULL THEN False 
		WHEN DATE(nm.created_at) = CURRENT_DATE THEN 
        CASE 
            WHEN CURRENT_TIME > CAST(_urgent_threshold AS time) THEN TRUE
            ELSE FALSE
        END
    ELSE TRUE  -- notification is not from today, mark as urgent
	END AS urgent,
    nm.bucket_name,
    CASE WHEN _fast_approaching_range IS NULL THEN False
        WHEN (_fast_approaching_range ? 'start') AND (_fast_approaching_range ? 'end') AND 
			now() > (_fast_approaching_range->>'start')::timestamptz AND 
            now() < (_fast_approaching_range->>'end')::timestamptz THEN true
        ELSE False
        END AS fast_approaching,
    False AS selected, nm.status AS read, nm.channels,
    nm.created_at::text, nm.updated_at::text, nm.url, nm.extra_attributes 
    FROM global.notifications_master nm
    WHERE 
        ((_bucket_name = 'Bookmarked' AND nm.bookmarked = TRUE)    -- handled bookmarked notifications specifically
        OR (_bucket_name != 'Bookmarked' AND nm.bucket_name = _bucket_name))
        AND nm.created_for = _user_code
        AND nm.application_code = _app_code 
		AND (_filter IS NULL OR _filter = '{}' OR  (SELECT array_agg(tag) 
                         			FROM jsonb_array_elements_text(nm.filter_tags) AS tag) && _filter)        
		AND nm.special_classification = _special_classification
        AND ((_bucket_name != 'Archived' AND nm.is_deleted = False)
            OR
            (_bucket_name = 'Archived' AND nm.is_deleted = True))
    ORDER BY nm.created_at DESC;

    RETURN input;
END;
$function$
;
