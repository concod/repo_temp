--liquibase formatted sql
--changeset liquibase:notification_actions_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_actions_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notification_actions_list(input text[], text[], jsonb);
CREATE OR REPLACE FUNCTION global.notification_actions_list(input text[], text[], jsonb)
 RETURNS TABLE(actions jsonb)
 LANGUAGE plpgsql
AS $function$
	declare
	_query_table_filters text := '';
	_query_combine text := '';
	begin
		_query_table_filters := global.form_table_query($3);
 		_query_combine := '
			select
				*
			from
				(
					select
						not_code, action
					from
						"global".notification_triggers_master ntm , "global".screen_master sm
					where
						ntm.screen_code = sm.screen_code 
						and product = any(''' || concat($1) || '''::varchar[])
						and sm.screen_name = any(''' || concat($2) || '''::varchar[])
					group by
						1
			) X' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute 'select jsonb_agg(jsonb_build_object(''not_code'', not_code, ''action'', action)) as actions from (' || _query_combine || ')x';
	end $function$
;
