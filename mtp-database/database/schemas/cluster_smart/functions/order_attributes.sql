--liquibase formatted sql
--changeset liquibase:Update order attributes runOnChange:true stripComments:false splitStatements:false context:MTP-52938 labels:liquibase_project_start
--comment: Update order of attributes by hierarchy level
--rollback: SELECT 1
DROP FUNCTION IF EXISTS cluster_smart.order_attributes(input jsonb, text);
CREATE OR REPLACE FUNCTION cluster_smart.order_attributes(input jsonb, text)
 RETURNS TABLE(_key text, _value text, _join_con text)
 LANGUAGE plpgsql
AS $function$
declare
	_query text;
begin
	_query := 'SELECT x.* FROM (SELECT *, case when value = ''[]'' then ''left join'' else ''join'' end as _join_con FROM jsonb_each_text(''' || concat($1) || ''') WHERE value IS NOT NULL) x join "cluster_smart".' || $2 || '_list y on x.key = y.attribute_name ORDER BY hierarchy_level, LENGTH(value) desc;';
	raise notice '%', _query;
	return QUERY execute _query;
end
$function$
;
