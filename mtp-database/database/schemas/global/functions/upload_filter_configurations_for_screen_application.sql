--liquibase formatted sql
--changeset liquibase:upload_filter_configurations_for_screen_application runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for upload_filter_configurations_for_screen_application
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.upload_filter_configurations_for_screen_application(input text, text);
CREATE OR REPLACE FUNCTION global.upload_filter_configurations_for_screen_application(input text, text)
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
            fc.fc_code 
        from 
            "global".filter_configurations fc 
        left join "global".application_master am on am.application_code = fc.application 
        left join "global".screen_master sm on sm.screen_code = any(fc.screens::int[])
        where 
            not is_deleted
            and lower($1) ilike sm.screen_name
            and lower($2) ILIKE am."name"
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
                    limit 1 offset 0)
        fco
            join "global".upload_filter_configurations_mapping fcm on
                fco.fc_code = fcm.fc_code
            where
                fcm.fc_code is not null
            order by
                fcm.display_order asc ,fcm.level asc;
	END
$function$
;
