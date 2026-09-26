--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_create_snowflake_data_partition runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_create_snowflake_data_partition
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_create_snowflake_data_partition;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_snowflake_data_partition()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        query text;
        partition_table_name text;
        current_date_in_timezone date;
       	_timezone text := 'US/Eastern';
       	_table_name text := 'tb_snowflake_data';
    begin
        current_date_in_timezone := date(timezone(_timezone, now()));
        
        partition_table_name := format('%1$s_%2$s', _table_name, to_char(current_date_in_timezone, 'MMDDYYYY'));
        raise notice 'table_name : %, partition_table_name : %', _table_name, partition_table_name;
        
        query := format('CREATE TABLE IF NOT EXISTS price_markdown.%1$s PARTITION OF price_markdown.%2$s FOR VALUES IN (''%3$s'')', 
                        partition_table_name, 
                        _table_name, 
                        current_date_in_timezone::text);
        raise notice 'partition create query : %', query;
        EXECUTE query;
    end;
$function$
;