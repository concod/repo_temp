--liquibase formatted sql
--changeset liquibase:sync_aggregation_time_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_aggregation_time_attributes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_aggregation_time_attributes();
CREATE OR REPLACE PROCEDURE public.sync_aggregation_time_attributes()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_aggregation_time_attributes';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
    _query text;
    _agg_level_db text;
    _drop_query text;
    _alter_query_1 text;
    _alter_query_2 text;
    begin
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    begin
       
        _drop_query  := 'delete from global.aggregation_time_attributes';
        _agg_level_db := global.fetch_aggregation_level();
        if _agg_level_db is not null and _agg_level_db <> 'product_code'
        then
            _query:= 'with article_product_map as (
                        select
                            max(product_code) as product_code,'
                            || _agg_level_db ||
                        ' from
                            global.product_attributes_filter
                        where
                            is_deleted is false
                        group by '
                            || _agg_level_db || ' ),
                        article_level_status as (
                        select '
                            || _agg_level_db || ' ,
                            psl.product_code,
                            attribute_name,
                            attribute_value,
                            start_time,
                            end_time
                        from
                            article_product_map apm
                        join global.product_time_attributes psl on
                            apm.product_code = psl.product_code
                            and psl.attribute_name = ''status'')
                        Insert into global.aggregation_time_attributes (aggregation_code, attribute_name, attribute_value, start_time, end_time)
                        select '
                            || _agg_level_db || ' as aggregation_code,
                            attribute_name,
                            attribute_value,
                            start_time,
                            end_time
                        from
                            article_level_status
                        group by '
                            || _agg_level_db || ' ,
                            attribute_name,
                            attribute_value,
                            start_time,
                            end_time
                           
                        ';
            raise notice 'query to refresh %', _query;
            execute _drop_query;
            raise notice 'table dropped successfully';
            execute _query;
        end if;
        call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
    exception
        when others then
            -- Log the error if an exception occurs during any part of the procedure
            call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
    end;
    end
$procedure$
;





