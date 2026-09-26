--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_create_pcd_config_json runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_create_pcd_config_json
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_create_pcd_config_json;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_pcd_config_json(p_calendar_config_id integer, p_start_date date)
 RETURNS jsonb
	LANGUAGE plpgsql
AS $function$
	DECLARE
        p_pcd_details jsonb;
	begin
        with calendar_pcds as (
            select
            calendar_config_id,
            frequency,
            frequency_id,
            start_date,
            end_date,
            jsonb_agg(
                jsonb_build_object(
                    'pcd_start_date', to_char(pcd_start_date,'MM/DD/YYYY'),
                    'pcd_end_date', to_char(pcd_end_date,'MM/DD/YYYY')
                )
                order by pcd_start_date
            ) as _details
            from (
                select
                    calendar_config_id,
                    frequency,
                    frequency_id,
                    pcd_start_date,
                    pcd_end_date,
                    (pcd_end_date - pcd_start_date)+ 1 as no_of_days,
                    trim(to_char(pcd_start_date, 'Day')) as pcd_start_day,
                    trim(to_char(pcd_end_date, 'Day')) as pcd_end_day,
                    min(pcd_start_date) over ( partition by calendar_config_id,frequency,frequency_id) as start_date,
                    max(pcd_end_date) over ( partition by calendar_config_id,frequency,frequency_id)  as end_date
                from
                    price_markdown.tb_calendar_pcd
                where
                    calendar_config_id = p_calendar_config_id
                    and pcd_start_date >= p_start_date
            ) s
            group by 1,2,3,4,5
        )
        select
            jsonb_agg(
                json_build_object(
                    'frequency',(
                            ((_details->>0)::jsonb->>'pcd_end_date')::date -
                            ((_details->>0)::jsonb->>'pcd_start_date')::date
                        )+1,
                    'details', tcp._details,
                    'start_date', to_char(tcp.start_date,'MM/DD/YYYY'),
                    'end_date',to_char(tcp.end_date,'MM/DD/YYYY')
                )
                order by tcp.start_date
            ) into p_pcd_details
        from
            calendar_pcds tcp;
        return p_pcd_details;
	end;
$function$
;