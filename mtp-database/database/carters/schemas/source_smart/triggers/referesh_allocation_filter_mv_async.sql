--liquibase formatted sql
--changeset mayank.mukundam:refresh_allocation_filter_mv_async stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:refresh_allocation_filter_mv_async
--comment: initial changeset for refresh_allocation_filter_mv_async

CREATE OR REPLACE FUNCTION source_smart.refresh_allocation_filter_mv_async()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Use NOTIFY to trigger a refresh
    NOTIFY refresh_allocation_filter_mv;
    RETURN NULL;
END;
$function$
;

create trigger trg_refresh_affemv_async after
insert
    or
delete
    or
update
    or
truncate
    on
    source_smart.allocation_filters for each statement execute function source_smart.refresh_allocation_filter_mv_async();