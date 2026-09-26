--liquibase formatted sql
--changeset liquibase:notification_screens_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_screens_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notification_screens_list(input text[], jsonb);
CREATE OR REPLACE FUNCTION global.notification_screens_list(input text[], jsonb)
 RETURNS TABLE(screens jsonb)
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
						screen_name screen
					from
						"global".notification_triggers_master ntm 
						join "global".screen_master sm on
						ntm.screen_code =sm.screen_code 
					where
						product = any(''' || concat($1) || '''::varchar[])
					group by
						1
			) X' || _query_table_filters;
		raise notice '%',_query_combine;
		return query execute 'select jsonb_build_object(''screens'', jsonb_agg(screen)) as screens from (' || _query_combine || ')x';
	end $function$
;
