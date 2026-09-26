--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:users_app_screen runOnChange:true stripComments:false splitStatements:false context:MTP-60324 labels:MTP-60324
--comment: handling scenarios when application is empty
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.users_app_screen(input integer[], character varying[]);
CREATE OR REPLACE FUNCTION global.users_app_screen(input integer[], character varying[])
 RETURNS TABLE(application_name character varying, screen_name character varying)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
_app_where_clause text := '';
begin

if array_length($2, 1) is not null then
	_app_where_clause := ' and lower(am.name)=any(''' || concat($2) || '''::varchar[])';
end if;
_query_combine := '
select 
      	am.name application_name, sm.screen_name
        from global.acl_master acm join
			global.user_access_hierarchy_mapping uahm on acm.acl_code=uahm.acl_code join 
			global.application_master am  on acm.application_code  = am.application_code join
			global.screen_master sm on acm.screen_code =sm.screen_code 
			where 
			1=1
			and	am.status 
			and acm.status 
			and uahm.user_code= any(''' || concat($1) || '''::int[]) 
			---acm.screen_code!=3 and
			' || _app_where_clause || '
			group by am.name,sm.screen_name
			order by sm.screen_name';
			
raise notice 'query: %', _query_combine;
return query execute _query_combine;
end
$function$
;



CREATE OR REPLACE FUNCTION global.users_app_screen(input integer[], character varying[], character varying[])
 RETURNS TABLE(application character varying, screen character varying, action character varying, access_hierarchy jsonb)
 LANGUAGE plpgsql
AS $function$
declare
_query_combine text := '';
--p1 :=
begin
_query_combine := 'select urm.application_code,urm.screen_name, am3."action",urm.access_hierarchy
					from
					(select  application_name application_code ,
					screen screen_name ,
					unnest(action_code::int[]) action_code,
					access_hierarchy::jsonb as access_hierarchy
					from  global.urm_master um
					where 1=1
					 and um.user_code= any(''' || concat($1) || '''::int[])
				     and lower(um."application_name") =any(''' || concat($2) || '''::varchar[])
					 and (lower(um.screen)=any(''' || concat($3) || '''::varchar[])
					  or um.screen =''All''
					)) urm
					join global.action_master am3
					on urm.action_code =am3.action_code
				order by urm.application_code,
							 urm.screen_name ';

raise notice '%',
_query_combine;
return query execute _query_combine;
end
$function$
;
