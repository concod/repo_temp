--liquibase formatted sql
--changeset liquibase:urm_acl_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for urm_acl_attributes
--rollback: SELECT 1
DROP VIEW IF EXISTS global.urm_acl_attributes;
create or replace view global.urm_acl_attributes
as
select * from (
 select  acl_code,
 'role_name' as "attribute_name",
 rm."name" as "attribute_value"
 from global.acl_master am, global.roles_master rm
 where am.role_code = rm.role_code
 union
 select  acl_code,
 'application_name' as "attribute_name",
 am2."name" as "attribute_value"
 from global.acl_master am, global.application_master am2
 where am.application_code = am2.application_code
 union
 select  acl_code,
 'screen_name' as "attribute_name",
 sm."screen_name" as "attribute_value"
 from global.acl_master am, global.screen_master sm
 where am.screen_code = sm.screen_code ) x;
