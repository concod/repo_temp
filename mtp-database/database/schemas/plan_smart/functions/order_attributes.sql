--liquibase formatted sql
--changeset liquibase:order_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for order_attributes
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.order_attributes(input jsonb, text);
CREATE OR REPLACE FUNCTION plan_smart.order_attributes(input jsonb, text)
 RETURNS TABLE(_key text, _value text, _join_con text)
 LANGUAGE plpgsql
AS $function$
 declare
 	_query text;
 begin
 	_query := 'SELECT x.* FROM (SELECT *, case when value = ''[]'' then ''left join'' else ''join'' end as _join_con FROM jsonb_each_text(''' || concat($1) || ''') WHERE value IS NOT NULL) x join "plan_smart".' || $2 || '_list y on x.key = y.attribute_name ORDER BY LENGTH(value) DESC, y.hierarchy_level ASC';
 	raise notice '%', _query;
 	return QUERY execute _query;
 end
 $function$

;