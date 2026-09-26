--liquibase formatted sql
--changeset liquibase:list_tags runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for list_tags
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.list_tags();
CREATE OR REPLACE FUNCTION global.list_tags()
 RETURNS TABLE(tag jsonb)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine :=	
		'SELECT to_jsonb(r) tag FROM (SELECT tag_code, tag_key, tag_value FROM "global".tags_master) r';
	
	

raise notice '%',
_query_combine;
return query execute _query_combine;
end
;

$function$
;


CREATE OR REPLACE FUNCTION global.list_tags(input integer[])
 RETURNS TABLE(tag_code integer, tag_datatype character varying, tag_key character varying, tag_value character varying)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine := '
select * from global.tags_master where tag_code= any(''' || concat($1) || '''::int[])';
raise notice '%',
_query_combine;
return query execute _query_combine;
end
$function$
;
