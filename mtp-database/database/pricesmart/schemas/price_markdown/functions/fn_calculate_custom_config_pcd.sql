--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_calculate_custom_config_pcd_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: bug fix for creating pcds
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_calculate_custom_config_pcd;
CREATE OR REPLACE FUNCTION price_markdown.fn_calculate_custom_config_pcd(
    p_calendar_config_id integer,
    p_start_date date,
    p_end_date date
 )
 RETURNS TABLE(
    pcd_start_date_ date,
    pcd_end_date_ date
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
	declare
        _no_of_days int;
        _individual_breakdown_config RECORD;
        _current_pcd_start_date date := p_start_date;
        _calendar_config_object price_markdown.tb_calendar_config%ROWTYPE;
        _pcd_details_json jsonb;

	begin

        drop table if exists tb_temp_pcd_values;
        create temp table if not exists tb_temp_pcd_values
        (
            pcd_start_date date,
            pcd_end_date date
        );

        select * into _calendar_config_object from price_markdown.tb_calendar_config
        where calendar_config_id = p_calendar_config_id;

        for _individual_breakdown_config in (
            select key,value from jsonb_each(
                _calendar_config_object.pcd_breakdown
            )
            order by key::int asc
        )
        loop
            _pcd_details_json = (_individual_breakdown_config.value->>'details')::jsonb;

            _no_of_days = (_individual_breakdown_config.value->>'no_of_days')::int;

            for _counter in 1..(_individual_breakdown_config.value->>'frequency')::int
            loop

                if _current_pcd_start_date>p_end_date then
                    exit;
                end if;

                insert into tb_temp_pcd_values
                (pcd_start_date,pcd_end_date)
                values
                (_current_pcd_start_date,least(p_end_date,_current_pcd_start_date+ _no_of_days - 1));

                _current_pcd_start_date = _current_pcd_start_date + _no_of_days;

            end loop;

        end loop;

        return query (
            select pcd_start_date,pcd_end_date
            from tb_temp_pcd_values
            order by pcd_start_date
        );

    end;
$function$
;