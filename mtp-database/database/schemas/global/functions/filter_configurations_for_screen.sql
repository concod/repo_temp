--liquibase formatted sql
--changeset arnab.nandy@impactanalytics.co:MTP-28616-filter_configurations_for_screen runAlways:true stripComments:false splitStatements:false context:handling-soft-delete labels:MTP-28616
--comment: handling soft deletion for filter_configurations_for_screen
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.filter_configurations_for_screen(input text);
CREATE OR REPLACE FUNCTION global.filter_configurations_for_screen(input text)
 RETURNS SETOF global.filter_configurations_mapping
 LANGUAGE plpgsql
AS $function$
	begin
	return QUERY
		select
			fcm.*
		from
			(
			select
				fc.fc_code fc_code
			from
				"global".filter_configurations fc
				 left join "global".screen_master sm
				 on sm.screen_code =any(fc.screens::integer[])
			where
				is_deleted = false
				AND lower($1) ilike sm.screen_name
				AND fc_code in (
				select
					fc_code
				from
					"global".filter_configurations_mapping
				group by
					1
				having
					count(*) > 0)
			order by
				updated_at desc
			limit 1 offset 0
		) fc
		join "global".filter_configurations_mapping fcm on
			fc.fc_code = fcm.fc_code

		where
			fcm.fc_code is not null and fcm.is_deleted = false
		order by
			fcm.display_order asc ,fcm.level asc;
		end
	$function$
;
