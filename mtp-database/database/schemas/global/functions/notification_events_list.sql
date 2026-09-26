--liquibase formatted sql
--changeset liquibase:notification_events_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_events_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notification_events_list(input integer);
CREATE OR REPLACE FUNCTION global.notification_events_list(input integer)
 RETURNS TABLE(noe_code integer, special_classification character varying, subject text, description text, departments character varying[], url text, channels character varying[], created_at timestamp with time zone, updated_at timestamp with time zone, screen_id integer, product character varying, screen character varying, action character varying, role_codes integer[], notification_channel character varying[], tags character varying[])
 LANGUAGE plpgsql
AS $function$
	declare
	_query_combine text := '';
	begin
 		_query_combine := '
				select
					nem.noe_code,
					nem.special_classification,
					nem.subject,
					nem.description,
					nem.departments,
					ntm.url,
					nem.channels,
					nem.created_at,
					nem.updated_at,
					ntm.not_code as screen_id,
					ntm.product,
					ntm.screen,
					ntm.action,
					nerm.role_codes,
					nem.notification_channel,
					ta.tags	
				from
					"global".notification_event_master nem
					join 
				(select nem.noe_code ,array_agg(tag_key) tags 
					from global.tags_master tm ,"global".notification_event_master nem
					where 1=1 
					and tm.tag_code =any (nem.tags_code::int[])
					group by 1) ta
				on ta.noe_code =nem.noe_code
				join (
					select
						netm.noe_code,
						ntm.not_code,
					    ntm.product as product,
						ntm.screen as screen,
                        ntm.action as action,
                        ntm.url as url
					from
						"global".notification_event_trigger_mapping netm
					join "global".notification_triggers_master ntm on
						netm.not_code = ntm.not_code
				) ntm
				on
					nem.noe_code = ntm.noe_code
				join (
					select
						noe_code,
						array_agg(distinct role_code) as role_codes
					from
						"global".notification_event_role_mapping
					group by
						noe_code 
				) nerm
				on
					nem.noe_code = nerm.noe_code
				where
					not nem.is_deleted
					and nem.noe_code = ' || $1 ||
		' Order by 1 desc';
		--raise notice '%',_query_combine;
		return query execute _query_combine;
	end 
$function$
;

CREATE OR REPLACE FUNCTION global.notification_events_list(input character varying, jsonb)
 RETURNS TABLE(noe_code integer, special_classification character varying, subject text, description text, departments character varying[], url text, channels character varying[], created_at timestamp with time zone, updated_at timestamp with time zone, screen_id integer, product character varying, screen character varying, action character varying, role_codes integer[], notification_channel character varying[], tags character varying[])
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($2);
 		_query_combine := '
			select
				*
			from
				(
				select
					nem.noe_code,
					nem.special_classification,
					nem.subject,
					nem.description,
					nem.departments,
					ntm.url,
					nem.channels,
					nem.created_at,
					nem.updated_at,
					ntm.not_code as screen_id,
					ntm.product,
					ntm.screen,
					ntm.action,
					nerm.role_codes,
					nem.notification_channel,
					ta.tags	
				from
					"global".notification_event_master nem
				left join 
				(select nem.noe_code ,array_agg(tag_key) tags 
					from global.tags_master tm ,"global".notification_event_master nem
					where 1=1 
					and tm.tag_code =any (nem.tags_code::int[])
					group by 1) ta
				on ta.noe_code =nem.noe_code
				join (
					select
						netm.noe_code,
						ntm.not_code,
					    ntm.product as product,
						sm.screen_name  as screen,
                        ntm.action as action,
						ntm.url as url
					from
						"global".notification_event_trigger_mapping netm
					join "global".notification_triggers_master ntm on
						netm.not_code = ntm.not_code 
					join "global".screen_master sm on
						ntm.screen_code = sm.screen_code
					where ntm.product = ''' || $1 || '''
				) ntm
				on
					nem.noe_code = ntm.noe_code
				join (
					select
						noe_code,
						array_agg(distinct role_code) as role_codes
					from
						"global".notification_event_role_mapping
					group by
						noe_code 
				) nerm
				on
					nem.noe_code = nerm.noe_code
				where
					not nem.is_deleted
			) X' ||
		' Order by 1 desc' || _query_table_filters;
     --   raise notice '%',_query_table_filters;
	--	raise notice '%',_query_combine;
		return query execute _query_combine;
	end 
$function$
;

CREATE OR REPLACE FUNCTION global.notification_events_list(input character varying, character varying, character varying, jsonb)
 RETURNS TABLE(noe_code integer, special_classification character varying, subject text, description text, departments character varying[], url text, channels character varying[], created_at timestamp with time zone, created_by integer, updated_at timestamp with time zone, screen_id integer, product character varying, screen character varying, action character varying, role_codes integer[], notification_channel character varying[], tags character varying[])
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($4);
 		_query_combine := '
			select
				*
			from
				(
				select
					nem.noe_code,
					nem.special_classification,
					nem.subject,
					nem.description,
					nem.departments,
					ntm.url,
					nem.channels,
					nem.created_at,
					nem.created_by,
					nem.updated_at,
					ntm.not_code as screen_id,
					ntm.product,
					ntm.screen,
					ntm.action,
					nerm.role_codes,
					nem.notification_channel,
					ta.tags	
				from
					"global".notification_event_master nem
				join 
				(select nem.noe_code ,array_agg(tag_key) tags 
					from global.tags_master tm ,"global".notification_event_master nem
					where 1=1 
					and tm.tag_code =any (nem.tags_code::int[])
					group by 1) ta
				on ta.noe_code =nem.noe_code
				join (
					select
						netm.noe_code,
						ntm.not_code,
					    ntm.product as product,
						sm.screen_name as screen,
                        ntm.action as action,
						ntm.url as url
					from
						"global".notification_event_trigger_mapping netm
					join "global".notification_triggers_master ntm on
						netm.not_code = ntm.not_code
					join "global".screen_master sm on
						ntm.screen_code = sm.screen_code
					where ntm.product = ''' || $1 || '''
						and sm.screen_name = ''' || $2 || '''
						and ntm.action = ''' || $3 || '''
				) ntm
				on
					nem.noe_code = ntm.noe_code
				join (
					select
						noe_code,
						array_agg(distinct role_code) as role_codes
					from
						"global".notification_event_role_mapping
					group by
						noe_code 
				) nerm
				on
					nem.noe_code = nerm.noe_code
				where
					not nem.is_deleted
			) X' ||' Order by 1 desc' || _query_table_filters
		;
        --raise notice '%',_query_table_filters;
		--raise notice '%',_query_combine;
		return query execute _query_combine;
	end 
$function$
;

