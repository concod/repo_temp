--liquibase formatted sql
--changeset liquibase:surya.avinash@impactanalytics.com: fn_auto_clearance_get_next_start_date_calendar_config runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_auto_clearance_get_next_start_date_calendar_config

DROP FUNCTION IF EXISTS price_markdown_opt.fn_auto_clearance_get_next_start_date_calendar_config();

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_auto_clearance_get_next_start_date_calendar_config(p_calendar_config_id integer, p_buffer_start_days integer, p_max_end_date date DEFAULT NULL::date)
 RETURNS TABLE(calendar_id integer, strategy_start_date date)
 LANGUAGE plpgsql
AS $function$
DECLARE
    _calendar_config_object price_markdown.tb_calendar_config%ROWTYPE;
    _table_name varchar;
    _query text;
    _day_name_column varchar;
    _weeks varchar[];
    _client_timezone varchar;
    _year_month_column varchar;
    _week_column varchar;
    _start_date date;
    _end_date date;
BEGIN
    SELECT * INTO _calendar_config_object
    FROM price_markdown.tb_calendar_config
    WHERE calendar_config_id = p_calendar_config_id;

    IF _calendar_config_object.calendar_type = 'Frequency' THEN
        _table_name = 'tb_fiscal_date_mapping';
        _day_name_column = 'fiscal_day_name';
        _year_month_column = 'fiscal_year, fiscal_month';
        _week_column = 'fiscal_week';
    ELSE
        _table_name = 'tb_calendar_date_mapping';
        _day_name_column = 'day_name';
        _year_month_column = 'year, month';
        _week_column = 'week';
    END IF;

    _client_timezone = (
        SELECT remarks
        FROM metaschema.tb_app_sub_master
        WHERE name = 'client_timezone'
    );

    _start_date = (
        DATE(TIMEZONE(_client_timezone, NOW())) + p_buffer_start_days
    );

    _end_date = (
        DATE(TIMEZONE(_client_timezone, NOW())) + MAKE_INTERVAL(months => (
            SELECT remarks::int
            FROM metaschema.tb_app_sub_master
            WHERE name = 'max_allowed_duration_to_end_a_strategy_in_months'
        ))
    );

    _end_date = LEAST(_end_date, p_max_end_date);

    IF _calendar_config_object.repeat_frequency = 'Month' THEN
        _weeks = ARRAY(
            SELECT SUBSTRING(week, 2)
            FROM UNNEST(_calendar_config_object.repeat_on_week) week
        );

        _query = FORMAT(
            '
                WITH dates_of_configured_week_days_cte AS (
                    SELECT
                        ROW_NUMBER() OVER (PARTITION BY %6$s ORDER BY date) AS row_num,
                        date
                    FROM global.%1$s
                    WHERE %3$s = ''%2$s''
                )
                SELECT
                    %10$s AS n_calendar_config_id, MIN(date) AS strategy_start_date
                FROM dates_of_configured_week_days_cte
                WHERE row_num IN (%5$s)
                AND date BETWEEN ''%8$s'' AND ''%9$s''
            ',
            _table_name,
            _calendar_config_object.on_day,
            _day_name_column,
            _client_timezone,
            ARRAY_TO_STRING(_weeks, ','),
            _year_month_column,
            _week_column,
            _start_date,
            _end_date,
            p_calendar_config_id
        );

    ELSE
        _query = FORMAT(
            '
                SELECT
                    %6$s AS n_calendar_config_id,
                    MIN(date) AS strategy_start_date
                FROM global.%1$s
                WHERE %3$s = ''%2$s''
                AND date BETWEEN ''%4$s'' AND ''%5$s''
            ',
            _table_name,
            _calendar_config_object.on_day,
            _day_name_column,
            _start_date,
            _end_date,
            p_calendar_config_id
        );
    END IF;

    RAISE NOTICE 'query: %', _query;

    RETURN QUERY EXECUTE _query;

END;
$function$
;
