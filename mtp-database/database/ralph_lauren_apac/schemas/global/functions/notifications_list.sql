--liquibase formatted sql
--changeset rahul.mishra@impactanalytics.co:notifications_list_RL runOnChange:true stripComments:false splitStatements:false context:release_1_0 labels:notifications_list_RL
--comment: restricting old notifications to not show allocation plans that are not finalised MTP-64305
--rollback: SELECT 1
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


DROP FUNCTION IF EXISTS global.notifications_list(input integer, numeric);
CREATE OR REPLACE FUNCTION global.notifications_list(input integer, numeric)
 RETURNS TABLE(no_code integer, special_classification character varying, subject text, description text, status integer, channels character varying[], created_at character varying, updated_at character varying, url text, extra_attributes jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	begin
		return query select
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
			(
			not no.is_deleted
			and no.created_for = $1
			and no.created_at > to_timestamp($2)
			)
			order by no_code desc;
	end 
$function$
;

DROP FUNCTION IF EXISTS global.notifications_list(input integer, integer, jsonb);
CREATE OR REPLACE FUNCTION global.notifications_list(input integer, integer, jsonb)
 RETURNS TABLE(no_code integer, special_classification character varying, subject text, description text, status integer, channels character varying[], created_at character varying, updated_at character varying, url text, extra_attributes jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	_con text[] := array['no.no_code = ' || $2, 'not no.is_deleted', 'no.created_for = ' || $1]::text[];
	begin
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