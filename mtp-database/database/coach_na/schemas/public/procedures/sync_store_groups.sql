--liquibase formatted sql
--changeset hemantkumar.bajaj@impactanalytics.co:sync_store_groups runOnChange:true stripComments:false splitStatements:false context:sync_store_groups labels:first commit
--comment: sync_store_groups
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_store_groups();


CREATE OR REPLACE PROCEDURE public.sync_store_groups()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
    _log_code varchar := gen_random_uuid();
    _sp_name varchar := 'public.sync_store_groups';
    _log_step varchar;
    _st TIMESTAMP := clock_timestamp();
begin
    call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
    perform set_config('local.log_code', _log_code, true);
    perform set_config('local.sp_name', _sp_name, true);
    begin
delete  from "global".store_groups sg
                            where (sg_code in
                        (select  store_group :: int as dpi_id
                        from public.store_group
                        group by 1
                        ));
insert into "global".store_groups(
          sg_code, "name", channel, application_code,
          special_classification
        )
        SELECT
        cast(store_group as int) sg_code,name as name,
          channel_id as channel,
          1 as application_code,
          'manual' as special_classification
        FROM
          (select store_group,name,channel_id from public.store_group x join global.store_master sm using(store_code)
          group by
store_group, name,channel_id
          ) as a on conflict(sg_code)
        WHERE
          (NOT is_deleted) do
        update
        SET
          channel = EXCLUDED.channel,
          application_code = EXCLUDED.application_code;
        delete FROM
         "global".store_groups_mapping
 where (sg_code in
                       (select  store_group :: int as dpi_id
                       from public.store_group
                       group by 1
                       ));
   
        INSERT INTO "global".store_groups_mapping (sg_code, store_code, ref_sg_code)
        SELECT
            sg.sg_code,
            x.store_code,
            null as ref_sg_code
        FROM
            public.store_group x
            JOIN global.store_groups sg ON sg.name = x.name
            JOIN global.store_master sm using(store_code)
        ON CONFLICT DO NOTHING;
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





