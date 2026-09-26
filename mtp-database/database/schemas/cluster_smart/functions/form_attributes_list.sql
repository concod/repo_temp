--liquibase formatted sql
--changeset liquibase:form_attributes_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for form_attributes_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.form_attributes_list(input jsonb, text);
CREATE OR REPLACE FUNCTION cluster_smart.form_attributes_list(input jsonb, text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
declare
	_filter_json jsonb;
	_query text := '';
begin
	_query := '
		select
			json_object_agg(y.attribute_name, case when x.key is null then ''[]'' else x.value end)
		from
			(
			select
				key,
				value
			from 
				jsonb_each_text(''' || ($1::text) || ''')) x
		right join (
			select
				attribute_name
			from
				"cluster_smart".' || $2 || '_list
			where
				is_hierarchy
				or is_attribute
		) y on
		x.key = y.attribute_name';
	--raise notice '%', _query;
	execute _query into _filter_json;
	return _filter_json;
end
$function$
;
