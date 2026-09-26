--liquibase formatted sql
--changeset liquibase:surya.avinash@impactanalytics.com: pc_auto_clearance_strategy_start_end_date runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_auto_clearance_strategy_start_end_date

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_auto_clearance_strategy_start_end_date();

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_auto_clearance_strategy_start_end_date(IN _trigger_config_ids integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _calendar_config_id INT;
BEGIN
    -- Truncate table x before starting
    TRUNCATE TABLE price_markdown_opt.tb_auto_clearance_calendar_strategy_start_date;
    TRUNCATE TABLE price_markdown_opt.tb_auto_clearance_strategy_start_end_date;

    -- Iterate over distinct config_id values
    FOR _calendar_config_id IN
        SELECT DISTINCT calendar_config_id FROM price_markdown.tb_strategy_config WHERE is_active =1 and trigger_config_id = any(_trigger_config_ids)
    LOOP
        -- Insert results of function call into table x
        INSERT INTO price_markdown_opt.tb_auto_clearance_calendar_strategy_start_date (calendar_config_id, strategy_start_date)
        SELECT calendar_id, strategy_start_date
        FROM price_markdown_opt.fn_auto_clearance_get_next_start_date_calendar_config(_calendar_config_id, 4);

    END LOOP;

   -- For each config get stg start and end date based on calendar config
   INSERT INTO price_markdown_opt.tb_auto_clearance_strategy_start_end_date (trigger_config_id, calendar_config_id, strategy_start_date, strategy_end_date)
        SELECT
            a.trigger_config_id,
            a.calendar_config_id,
            b.strategy_start_date,
            b.strategy_start_date + (a.no_of_weeks * 7 + a.no_of_days) AS strategy_end_date
        FROM
            price_markdown.tb_strategy_config a
        INNER JOIN
            price_markdown_opt.tb_auto_clearance_calendar_strategy_start_date b
        ON
            a.calendar_config_id = b.calendar_config_id
        WHERE is_active = 1 and b.strategy_start_date is not null ;
END $procedure$
;
