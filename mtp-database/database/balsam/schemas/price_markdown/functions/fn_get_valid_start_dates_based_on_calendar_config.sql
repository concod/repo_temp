--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_valid_start_dates_based_on_calendar_config_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_get_valid_start_dates_based_on_calendar_config_2





DROP FUNCTION IF EXISTS price_markdown.fn_get_valid_start_dates_based_on_calendar_config;

CREATE OR REPLACE FUNCTION price_markdown.fn_get_valid_start_dates_based_on_calendar_config(
    p_calendar_config_id integer,
    p_max_end_date date default null
 )
 RETURNS jsonb
LANGUAGE plpgsql
AS $function$
	declare
        _calendar_config_object price_markdown.tb_calendar_config%ROWTYPE;
        _table_name varchar;
        _query text;
        _fiscal_day_name varchar;
        _timezone varchar;
        _day_name_column varchar;
        _weeks varchar[];
        _client_timezone varchar;
        _year_month_column varchar;
        _order_by_column_in_partition varchar;
        _start_date date;
        _end_date date;
        final_response jsonb;
	begin

        select * into _calendar_config_object from price_markdown.tb_calendar_config
        where calendar_config_id = p_calendar_config_id;

        if _calendar_config_object.calendar_type = 'Frequency' then
            _table_name = 'tb_fiscal_date_mapping';
            _day_name_column = 'fiscal_day_name';
            _year_month_column = 'fiscal_year,fiscal_month';
            _order_by_column_in_partition = 'date';
        else
            _table_name = 'tb_calendar_date_mapping';
            _day_name_column = 'day_name';
            _year_month_column = 'year,month';
            _order_by_column_in_partition = 'date';
        end if;

        _client_timezone = (select remarks from metaschema.tb_app_sub_master where name = 'client_timezone');

        _start_date = (
                        date(timezone(_client_timezone,now()))
                        +
                        (select remarks::int from metaschema.tb_app_sub_master where name = 'min_allowed_duration_to_start_a_strategy_in_days')
                    );
        _end_date = (date(timezone(_client_timezone,now())) + make_interval(months=>(
            select remarks::int from metaschema.tb_app_sub_master where name = 'max_allowed_duration_to_end_a_strategy_in_months'
        )));

        _end_date = least(_end_date,p_max_end_date);

        if _calendar_config_object.repeat_frequency = 'Month' then

            _weeks = array(select substring(week,2) from unnest(_calendar_config_object.repeat_on_week) week);

            _query =  format(
                '
                    with dates_of_configured_week_days_cte as (
                        select
                            row_number()  over (partition by %6$s order by %7$s) as row_num,
                            date
                        from global.%1$s
                        where %3$s = ''%2$s''
                    )
                    select
                        jsonb_build_object(
                            ''valid_dates'',array_agg(
                                jsonb_build_object(
                                    ''start_date'',date
                                )
                            ),
                            ''start_from'', min(date),
                            ''end_at'', ''%9$s''
                        )
                    from dates_of_configured_week_days_cte
                    where row_num in (%5$s)
                    and date between ''%8$s'' and ''%9$s''
                ',
                _table_name,
                _calendar_config_object.on_day,
                _day_name_column,
                _client_timezone,
                array_to_string(_weeks,','),
                _year_month_column,
                _order_by_column_in_partition,
                _start_date,
                _end_date
            );


        else

            _query = format('
                    select
                        jsonb_build_object(
                            ''valid_dates'',array_agg(
                                jsonb_build_object(
                                    ''start_date'',date
                                )
                                order by date
                            ),
                            ''start_from'',min(date),
                            ''end_at'',''%6$s''
                        )
                    from global.%1$s
                    where %3$s = ''%2$s''
                    and date between ''%5$s'' and ''%6$s''
                ',
                _table_name,
                _calendar_config_object.on_day,
                _day_name_column,
                _client_timezone,
                _start_date,
                _end_date
            );

        end if;

        raise notice 'query: %',_query;

        execute _query into final_response;

        return final_response;

    end;
$function$
;
