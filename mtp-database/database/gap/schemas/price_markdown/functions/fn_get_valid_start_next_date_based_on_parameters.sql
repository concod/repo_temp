--liquibase formatted sql
--changeset shubh.bafna@impactanalytics.co:fn_get_valid_start_next_date_based_on_parameters runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_get_valid_start_next_date_based_on_parameters


-- this function is used to get the just next valid start date based on the pcd parameters passed in the payload

DROP FUNCTION if exists price_markdown.fn_get_valid_start_next_date_based_on_parameters(jsonb, date);
CREATE OR REPLACE FUNCTION price_markdown.fn_get_valid_start_next_date_based_on_parameters(p_payload jsonb, p_max_end_date date DEFAULT NULL::date)
 RETURNS TABLE(valid_dates jsonb, start_from date, end_at date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    -- Extracted parameters
    _calendar_type          varchar;
    _config_name            varchar;
    _on_day                 varchar;
    _pcd_type               varchar;
    _repeat_every           int;
    _repeat_frequency       varchar;
    _repeat_on_week         text[];
    _calendar_config_id     int;

    -- Other variables
    _table_name             varchar;
    _day_name_column        varchar;
    _year_month_column      varchar;
    _order_by_column_in_partition varchar;
    _client_timezone        varchar;
    _start_date             date;
    _end_date               date;
    _query                  text;
    final_response          jsonb;
BEGIN
    
    _calendar_type       := p_payload->'parameters'->>'calendar_type';
    _config_name         := p_payload->'parameters'->>'config_name';
    _on_day              := p_payload->'parameters'->>'on_day';
    _pcd_type            := p_payload->'parameters'->>'pcd_type';
    _repeat_every        := COALESCE((p_payload->'parameters'->>'repeat_every')::int, 1);
    _repeat_frequency    := p_payload->'parameters'->>'repeat_frequency';
    _calendar_config_id  := COALESCE((p_payload->'parameters'->>'calendar_config_id')::int, NULL);
    _repeat_on_week      := COALESCE(ARRAY(
                              SELECT jsonb_array_elements_text(p_payload->'parameters'->'repeat_on_week')
                          ), ARRAY[]::text[]);

    
     -- Determine which mapping table to use
    
    IF _calendar_type = 'Frequency' THEN
        _table_name = 'tb_fiscal_date_mapping';
        _day_name_column = 'fiscal_day_name';
        _year_month_column = 'fiscal_year,fiscal_month';
        _order_by_column_in_partition = 'date';
    ELSE
        _table_name = 'tb_calendar_date_mapping';
        _day_name_column = 'day_name';
        _year_month_column = 'year,month';
        _order_by_column_in_partition = 'date';
    END IF;

     -- Get client timezone and duration limits
    _client_timezone = (SELECT remarks FROM metaschema.tb_app_sub_master WHERE name = 'client_timezone');

    _start_date := (
        date(timezone(_client_timezone, now()))
        + (SELECT remarks::int FROM metaschema.tb_app_sub_master WHERE name = 'min_allowed_duration_to_start_a_strategy_in_days')
    );

    _end_date := (
        date(timezone(_client_timezone, now()))
        + make_interval(months => (
            SELECT remarks::int FROM metaschema.tb_app_sub_master WHERE name = 'max_allowed_duration_to_end_a_strategy_in_months'
        ))
    );

    _end_date := least(_end_date, p_max_end_date);

     -- Build dynamic SQL based on frequency
    IF _repeat_frequency = 'Month' THEN
        -- Convert repeat_on_week like ["W2","W4"] -> [2,4]
        _repeat_on_week := ARRAY(
            SELECT substring(val from 2)::text
            FROM unnest(_repeat_on_week) val
        );

        _query := format(
            '
            WITH dates_of_configured_week_days_cte AS (
                SELECT
                    row_number() OVER (PARTITION BY %6$s ORDER BY %7$s) AS row_num,
                    date
                FROM global.%1$s
                WHERE %3$s = ''%2$s''
            )
            SELECT
                jsonb_build_object(''start_date'', MIN(date)) AS valid_dates,
                MIN(date) AS start_from,
                ''%9$s''::date AS end_at
            FROM dates_of_configured_week_days_cte
            WHERE row_num IN (%5$s)
            AND date BETWEEN ''%8$s'' AND ''%9$s'';
            ',
            _table_name,
            _on_day,
            _day_name_column,
            _client_timezone,
            array_to_string(_repeat_on_week, ','),
            _year_month_column,
            _order_by_column_in_partition,
            _start_date,
            _end_date
        );

    ELSE
        -- For weekly / other frequencies
        _query := format(
            '
            SELECT
                jsonb_build_object(''start_date'', MIN(date)) AS valid_dates,
                MIN(date) AS start_from,
                ''%6$s''::date AS end_at
            FROM global.%1$s
            WHERE %3$s = ''%2$s''
            AND date BETWEEN ''%5$s'' AND ''%6$s'';
            ',
            _table_name,
            _on_day,
            _day_name_column,
            _client_timezone,
            _start_date,
            _end_date
        );
    END IF;

    RAISE NOTICE 'Generated Query: %', _query;

    RETURN QUERY EXECUTE _query;
END;
$function$
;
