--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_calculate_frequency_based_pcd-3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated order by key for partitioning for monthly pcds
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_calculate_frequency_based_pcd;
CREATE OR REPLACE FUNCTION price_markdown.fn_calculate_frequency_based_pcd(
    p_calendar_config_id integer,
    p_start_date date,
    p_end_date date
 )
 RETURNS TABLE(
    pcd_start_date_ date,
    pcd_end_date_ date
 )
 LANGUAGE plpgsql
AS $function$
	declare
        _calendar_config_object price_markdown.tb_calendar_config%ROWTYPE;
        _repeat_on_weeks int[];
        _table_name varchar;
        _query text;
        _day_name_column varchar;
        _year_month_column varchar;
        _partition_order_by_column varchar;

	begin

        select * into _calendar_config_object
        from price_markdown.tb_calendar_config
        where calendar_config_id = p_calendar_config_id;

        if _calendar_config_object.calendar_type = 'Calendar' then
            _table_name = 'tb_calendar_date_mapping';
            _day_name_column = 'day_name';
            _year_month_column = 'year,month';
            _partition_order_by_column = 'date';
        else
            _table_name = 'tb_fiscal_date_mapping';
            _day_name_column = 'fiscal_day_name';
            _year_month_column = 'fiscal_year,fiscal_month';
            _partition_order_by_column = 'date';
        end if;

        if _calendar_config_object.repeat_frequency = 'Week' then
            _query = format('
                with dates_of_configured_week_days_cte as (
                    select
                        row_number() over (order by date) as row_num,
                        date
                    from global.%3$s
                    where date between ''%1$s'' and ''%2$s''
                    and %6$s = ''%4$s''
                ),
                dates_based_on_frequency_configured_cte as (
                    select
                        row_number() over (order by date) as row_num,
                        date
                    from dates_of_configured_week_days_cte
                    where (row_num-1) %% %5$s =0
                )
                select
                    s1.date as pcd_start_date,
                    coalesce(s2.date-1,''%2$s'') as pcd_end_date
                from
                    dates_based_on_frequency_configured_cte s1
                    left join dates_based_on_frequency_configured_cte s2
                on s1.row_num =  s2.row_num-1
                order by pcd_start_date
            ',
            p_start_date,
            p_end_date,
            _table_name,
            _calendar_config_object.on_day,
            _calendar_config_object.repeat_every,
            _day_name_column
            );


        elsif _calendar_config_object.repeat_frequency = 'Month' then

            _repeat_on_weeks = array(select substring(week,2)::int from unnest(_calendar_config_object.repeat_on_week) week);

            _query = format('
                with dates_of_configured_week_days_cte as (
                    select
                        row_number()  over (partition by %7$s order by %8$s) as row_num,
                        date
                    from 
                    global.%3$s
                    where (%7$s) in (
                        select
                            distinct
                            %7$s
                        from global.%3$s
                        where date between ''%1$s'' and ''%2$s''
                    )
                    and %6$s = ''%4$s''
                ),
                dates_based_on_frequency_configured_cte as (
                    select
                        0 as row_num,
                        ''%1$s'' as date
                    from dates_of_configured_week_days_cte
                    where date=''%1$s''
                    union all
                    select
                        row_number() over (order by date) as row_num,
                        date
                    from dates_of_configured_week_days_cte
                    where row_num = any(array[%5$s])
                    and date > ''%1$s'' and date <= ''%2$s''
                )
                select
                    s1.date as pcd_start_date,
                    least(s2.date-1,''%2$s'') as pcd_end_date
                from dates_based_on_frequency_configured_cte s1
                left join dates_based_on_frequency_configured_cte s2
                on s1.row_num = s2.row_num - 1
            ',
            p_start_date,
            p_end_date,
            _table_name,
            _calendar_config_object.on_day,
            array_to_string(_repeat_on_weeks,','),
            _day_name_column,
            _year_month_column,
           _partition_order_by_column
            );



        end if;
        raise notice 'query: %',_query;

        return query execute _query;

    end;
$function$
;
