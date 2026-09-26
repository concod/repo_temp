--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_copy_calendar_config_json runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_copy_calendar_config_json
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_copy_calendar_config_json;
CREATE OR REPLACE FUNCTION price_markdown.fn_copy_calendar_config_json(p_calendar_config_json jsonb, p_start_date date, p_end_date date)
 RETURNS jsonb
	LANGUAGE plpgsql
AS $function$
	declare
		response jsonb;
	begin

		with calendar_pcds_cte as (
			select start_date,end_date,
					jsonb_agg(
						jsonb_build_object(
							'pcd_start_date',to_char(pcd_start_date,'MM/DD/YYYY'),
							'pcd_end_date',to_char(pcd_end_date,'MM/DD/YYYY')
						)
						order by pcd_start_date
					) as _details
				from jsonb_to_recordset(p_calendar_config_json)
					as calendar_config(
						details jsonb,
						end_date date,
						frequency int,
						start_date date
					)
					cross join
					lateral jsonb_to_recordset(calendar_config.details)
						as pcd_details(
							pcd_start_date date,
							pcd_end_date date
						)
			where calendar_config.end_date > p_start_date
			and pcd_details.pcd_end_date>p_start_date
			group by 1,2
		)
		select jsonb_agg(
			jsonb_build_object(
				'start_date',to_char(greatest(start_date,p_start_date),'MM/DD/YYYY'),
				'end_date',to_char(least(p_end_date,end_date),'MM/DD/YYYY'),
				'frequency',(((_details->>0)::jsonb->>'pcd_end_date')::date-(
						(_details->>0)::jsonb->>'pcd_start_date')::date)+1,
				'details',_details
			)
			order by start_date
		) into response from calendar_pcds_cte;
		return response;

	END;
$function$
;