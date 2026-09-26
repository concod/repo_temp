--liquibase formatted sql
--changeset shubh.bafna@impactanalytics.co:fn_v3_calculate_custom_config_pcd_with_parameters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_v3_calculate_custom_config_pcd_with_parameters

-- this function is used to calculate the pcds for a custom config calendar type with parameters

DROP FUNCTION if exists price_markdown.fn_v3_calculate_custom_config_pcd_with_parameters(jsonb, date, date);
CREATE OR REPLACE FUNCTION price_markdown.fn_v3_calculate_custom_config_pcd_with_parameters(p_config_payload jsonb, p_start_date date, p_end_date date)
 RETURNS TABLE(pcd_start_date_ date, pcd_end_date_ date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _no_of_days int;
        _individual_breakdown_config RECORD;
        _current_pcd_start_date date := p_start_date;
        _pcd_breakdown jsonb;
        _counter int;

    begin

        drop table if exists tb_temp_pcd_values;
        create temp table if not exists tb_temp_pcd_values
        (
            pcd_start_date date,
            pcd_end_date date
        );

        -- Extract pcd_breakdown from the payload
        _pcd_breakdown = (p_config_payload->'parameters'->>'pcd_breakdown')::jsonb;

        for _individual_breakdown_config in (
            select * from jsonb_array_elements(_pcd_breakdown)
        )
        loop
            _no_of_days = (_individual_breakdown_config.value->>'no_of_days')::int;

            for _counter in 1..(_individual_breakdown_config.value->>'frequency')::int
            loop

                if _current_pcd_start_date > p_end_date then
                    exit;
                end if;

                insert into tb_temp_pcd_values
                (pcd_start_date, pcd_end_date)
                values
                (_current_pcd_start_date, least(p_end_date, _current_pcd_start_date + _no_of_days - 1));

                _current_pcd_start_date = _current_pcd_start_date + _no_of_days;

            end loop;

        end loop;

        return query (
            select pcd_start_date, pcd_end_date
            from tb_temp_pcd_values
            order by pcd_start_date
        );

    end;
$function$
;
