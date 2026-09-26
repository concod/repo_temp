
--liquibase formatted sql
--changeset mayank.mukundam:refresh_allocation_rule_facility_eligibility_mv stripComments:false splitStatements:false context:Release_1_1 runOnChange:true labels:adding_security_definer
--comment: adding security definer

DROP FUNCTION IF EXISTS source_smart.refresh_allocation_rule_facility_eligibility_mv() CASCADE;

CREATE OR REPLACE FUNCTION source_smart.refresh_allocation_rule_facility_eligibility_mv()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY source_smart.allocation_rule_facility_eligibility_mv;
    RETURN NULL;
END;
$function$;

create or replace trigger trg_refresh_allocation_rule_facility_eligibility_mv after
insert
    or
delete
    or
update
    or
truncate
    on
    source_smart.allocation_rule for each statement execute function source_smart.refresh_allocation_rule_facility_eligibility_mv();