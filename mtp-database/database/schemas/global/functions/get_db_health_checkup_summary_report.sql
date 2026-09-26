
--liquibase formatted sql
--changeset shaik.azmathulla :get_db_health_checkup_summary_report_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:get_db_health_checkup_summary_report_v2
--comment: getting db_health_checkup summary for email body
--rollback: SELECT 1

DROP FUNCTION IF EXISTS global.get_db_health_checkup_summary_report;
CREATE OR REPLACE FUNCTION global.get_db_health_checkup_summary_report()
RETURNS TABLE (report_type varchar,report_date date,report_summary int )
LANGUAGE plpgsql
AS $function$
BEGIN

    RETURN QUERY
	SELECT a.report_type,a.report_date,a.report_summary
	FROM
	(
	    SELECT  catagory_name AS report_type,summary_date AS report_date,health_summary AS report_summary,
				row_number()over(partition by hcs.health_checkup_id,summary_date order by max_log_id desc) as rn --added this for if same day run twise then it will give latest summmary report.
	    FROM 	global.health_checkup_summary hcs
	    INNER JOIN global.health_checkup_master hcm ON hcs.health_checkup_id = hcm.health_checkup_id 
	    WHERE hcm.is_active AND summary_date = current_date 
	) a
	WHERE rn = 1 ;

END;
$function$;