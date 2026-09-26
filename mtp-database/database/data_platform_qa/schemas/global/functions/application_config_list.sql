--liquibase formatted sql
--changeset liquibase:application_config_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for application_config_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.application_config_list(input character);
CREATE OR REPLACE FUNCTION global.application_config_list(input character)
 RETURNS TABLE(attributes json)
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text := '';
begin
_query_combine :=	
		'select attributes from (
		   select am.name,json_agg( json_build_object (''attribute_name'',am2.name,
		''attribute_value'', am2.attribute_value,
		''attribute_type'', am2.attribute_type,
		''status'', am.status,
		''description'', am2.description
		)
		) attributes
	from 
		global.application_master am join 
		global.attributes_master am2 
		on am2.attribute_code  	= any (am.attribute_code) 
		where am2.attribute_type =''APPLICATION''
		and lower(am.name)=lower (''' || $1 || ''')
		group by  am.name)x';
	
	-- for rec in execute _query_combine
	 -- loop 
	 -- 	attr:= array_append (attr,rec.name::text||','||rec.attribute_value::text
	 -- ||','||rec.attribute_type::text ||','||rec.status::text||','||rec.description::text);
	 -- end loop;

raise notice '%',
_query_combine;
return query execute _query_combine;
end
;

$function$
;
