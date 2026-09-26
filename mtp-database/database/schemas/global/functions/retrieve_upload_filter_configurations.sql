--liquibase formatted sql
--changeset liquibase:retrieve_upload_filter_configurations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for retrieve_upload_filter_configurations
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.retrieve_upload_filter_configurations(input text);
CREATE OR REPLACE FUNCTION global.retrieve_upload_filter_configurations(input text)
 RETURNS SETOF global.upload_filter_configurations_mapping
 LANGUAGE plpgsql
AS $function$
	BEGIN
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
					"global".upload_filter_configurations_mapping
				group by
					1
				having
					count(*) > 0)
			order by
				updated_at desc
			limit 1 offset 0
		) fc
		join "global".upload_filter_configurations_mapping fcm on
			fc.fc_code = fcm.fc_code

		where
			fcm.fc_code is not null and fcm.is_deleted = false
		order by
			fcm.display_order asc ,fcm.level asc;
	END;
$function$
;
