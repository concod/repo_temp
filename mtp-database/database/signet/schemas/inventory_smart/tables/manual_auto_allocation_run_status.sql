--liquibase formatted sql
--changeset liquibase:manual_auto_allocation_run_status stripComments:false splitStatements:false context:new_table_creation labels:MTP-29831
--comment: creating a table which tracks some steps of auto allocations to determine when to run the manual steps of auto allocations.

CREATE TABLE inventory_smart.manual_auto_allocation_run_status
as 
(
select 'step1' as step, now() as status
)
union all
(
select 'step2' as step, now() as status
);
