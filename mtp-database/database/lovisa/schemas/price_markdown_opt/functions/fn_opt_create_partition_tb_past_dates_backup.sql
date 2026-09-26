--liquibase formatted sql
--changeset liquibase:fn_opt_create_partition_tb_past_dates_backup_v2709 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for fn_opt_insert_disc_ia

DROP FUNCTION IF EXISTS price_markdown_opt.fn_opt_create_partition_tb_past_dates_backup(ip_date date, ip_date_2 date);

CREATE OR REPLACE FUNCTION price_markdown_opt.fn_opt_create_partition_tb_past_dates_backup(ip_date date, ip_date_2 date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    week_start_date_var DATE;
    week_end_date_var DATE;
BEGIN
    -- Find the week start date from the fiscal mapping table for ip_date
    SELECT weeks_start_date, weeks_start_date + 6 as week_end_date INTO week_start_date_var, week_end_date_var
    FROM global.tb_fiscal_date_mapping
    WHERE date = ip_date;

    -- Create a partition for the specified table based on the week start date if it doesn't exist
    EXECUTE FORMAT('
        CREATE TABLE IF NOT EXISTS price_markdown_opt.tb_past_dates_backup_v1_%s PARTITION OF price_markdown_opt.tb_past_dates_backup FOR VALUES FROM (''%s'') TO (''%s'')',
        to_char(week_start_date_var, 'YYYY_MM_DD'),
        week_start_date_var,
        week_end_date_var+1
    );

    WHILE week_start_date_var + 7 <= ip_date_2+7 LOOP
        week_start_date_var := week_start_date_var + 7;
        week_end_date_var := week_start_date_var + 6;

        -- Create a partition for the next week
        EXECUTE FORMAT('
            CREATE TABLE IF NOT EXISTS price_markdown_opt.tb_past_dates_backup_v1_%s PARTITION OF price_markdown_opt.tb_past_dates_backup FOR VALUES FROM (''%s'') TO (''%s'')',
            to_char(week_start_date_var, 'YYYY_MM_DD'),
            week_start_date_var,
            week_end_date_var+1
        );
    END LOOP;
END;
$function$
;