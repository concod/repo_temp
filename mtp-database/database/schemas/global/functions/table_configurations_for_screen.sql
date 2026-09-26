--liquibase formatted sql
--changeset liquibase:table_configurations_for_screen runAlways:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for table_configurations_for_screen
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.table_configurations_for_screen(input text);
CREATE OR REPLACE FUNCTION global.table_configurations_for_screen(input text)
 RETURNS SETOF global.table_configurations_mapping
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			tcm.*
		from
			(
			select
				tc_code
			from
				"global".table_configurations
			where
				(lower($1) ILIKE any(screens) or lower('all') ILIKE any(screens))
				and tc_code in (
				select
					tc_code
				from
					"global".table_configurations_mapping
				group by
					1
				having
					count(*) > 0)
			order by
				updated_by desc
			limit 1 offset 0
		) tc
		join "global".table_configurations_mapping tcm on
			tc.tc_code = tcm.tc_code
		where
			tcm.tc_code is not null
		order by
			tcm.order_of_display asc;
		end
	$function$
;
