--liquibase formatted sql
--changeset konakandla.sujan@impactanalytics.co:notifications_list_RL,MTP-74252 runOnChange:true stripComments:false splitStatements:false context:release_1_0 labels:notifications_list_RL,MTP-74252
--comment: restricting old notifications to not show allocation plans that are not finalised MTP-64305, modifying realtime notification response
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notifications_list(input integer, numeric);
CREATE OR REPLACE FUNCTION global.notifications_list(input integer, numeric)
 RETURNS TABLE(no_code integer, special_classification character varying, subject text, description text, status integer, bookmarked boolean, bucket_name text, application_code integer, urgent boolean, fast_approaching boolean, selected boolean, read integer, channels character varying[], created_at character varying, updated_at character varying, url text, extra_attributes jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_urgent_threshold timestamptz;
	_fast_approaching_range jsonb;
	begin
		-- retrieve user's settings
		select (settings->>'urgency_threshold')::timestamptz, (settings->>'fast_approaching')::jsonb
		into _urgent_threshold, _fast_approaching_range
		from global.user_notification_settings
		where user_code = $1;
	
		RAISE NOTICE 'urgent: %', _urgent_threshold;
		RAISE NOTICE 'fast approaching: %', _fast_approaching_range::text;

		return query
		SELECT nm.no_code, nm.special_classification, nm.subject, nm.description, nm.status,
		nm.bookmarked, nm.bucket_name, nm.application_code,
		CASE WHEN _urgent_threshold IS NULL THEN False 
		WHEN DATE(nm.created_at) = CURRENT_DATE THEN 
	        CASE 
	            WHEN CURRENT_TIME > CAST(_urgent_threshold AS time) THEN TRUE
	            ELSE FALSE
	        END
	    ELSE TRUE  -- notification is not from today, mark as urgent
		END AS urgent,
		CASE WHEN _fast_approaching_range IS NULL THEN False
        WHEN (_fast_approaching_range ? 'start') AND (_fast_approaching_range ? 'end') AND 
			now() > (_fast_approaching_range->>'start')::timestamptz AND 
            now() < (_fast_approaching_range->>'end')::timestamptz THEN true
        ELSE False
        END AS fast_approaching,
		False as selected, nm.status as read, nm.channels,
		concat(nm.created_at)::varchar, concat(nm.updated_at)::varchar, nm.url, nm.extra_attributes 
		from
			"global".notifications_master nm
		where
			(
			not nm.is_deleted
			and nm.created_for = $1
			and nm.created_at > to_timestamp($2)
			)
			order by no_code desc;
	end 
$function$
;

DROP FUNCTION IF EXISTS global.notifications_list(input integer, character varying, jsonb);
CREATE OR REPLACE FUNCTION global.notifications_list(input integer, character varying, jsonb)
 RETURNS TABLE(no_code integer, special_classification character varying, subject text, description text, status integer, channels character varying[], created_at character varying, updated_at character varying, url text, extra_attributes jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	_type varchar := $2;
	_con text[] := array['not no.is_deleted', 'no.created_for = ' || $1]::text[];
	begin
		if _type = 'all' then
			_con := array_append(_con, '(no.created_at >= (NOW() - INTERVAL ''24 HOURS''))');
		elseif _type = 'informational' then
			_con := array_append(_con, '(no.created_at >= (NOW() - INTERVAL ''24 HOURS''))');
			_con := array_append(_con, '(no.special_classification = ''informational'')');
		elseif _type = 'actionable' then
			_con := array_append(_con, '(no.created_at >= (NOW() - INTERVAL ''24 HOURS''))');
			_con := array_append(_con, '(no.special_classification = ''actionable'')');
		elseif _type = 'old' then
        	_con := array_append(_con, '((no.noe_code in (17,18,220,221,222,223,225) and no.created_at < (NOW() - INTERVAL ''24 HOURS'') AND no.created_at >= (NOW() - INTERVAL ''7 DAYS'')) or (no.noe_code not in (17,18,220,221,222,223,225,20,21) and no.created_at < (NOW() - INTERVAL ''24 HOURS'')))');
		end if;
		raise notice '%',_con;
		_query_table_filters := global.form_table_query($3);
 		_query_combine := '
			select
				*
			from
				(
				select
					no.no_code,
					no.special_classification,
					no.subject,
					no.description,
					no.status,
					no.channels,
                    concat(no.created_at)::varchar,
					concat(no.updated_at)::varchar,
					no.url,
					no.extra_attributes
				from
					"global".notifications_master no
				where
					' || (ARRAY_TO_STRING(_con, ' AND ', '')) || '
			) X order by no_code desc' || _query_table_filters;
        raise notice '%',_query_table_filters;
		raise notice '%',_query_combine;
		return query execute _query_combine;
	end 
$function$
;
