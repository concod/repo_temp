--liquibase formatted sql
--changeset chaitanyaprasad.reddy:arhaus_urm_master_view runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:arhaus_urm_master_view
--comment: initial commit for arhaus urm_master view
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".urm_master;
CREATE OR REPLACE VIEW "global".urm_master
AS SELECT a.user_code,
    a.user_name,
    a.name,
    a.application_name,
    a.role_name,
    a.role_code,
    a.access_hierarchy,
    a.action_code,
    a.screen_name AS screen,
    a.hierarchy_id,
    a.custom_attributes,
    a.email
   FROM ( SELECT um.user_code,
            um.user_name,
            um.name,
            um.email,
            am2.name AS application_name,
            rm.name AS role_name,
            rm.role_code,
            rm.action_code,
            sm.screen_name,
            uahm.access_hierarchy,
            uahm.hierarchy_id,
            ua.attribute_value AS custom_attributes
           FROM global.user_master um
             LEFT JOIN global.user_access_hierarchy_mapping uahm ON um.user_code = uahm.user_code
             LEFT JOIN global.acl_master am ON am.acl_code = uahm.acl_code
             LEFT JOIN global.screen_master sm ON sm.screen_code = am.screen_code
             LEFT JOIN global.roles_master rm ON am.role_code = rm.role_code
             LEFT JOIN global.application_master am2 ON am.application_code = am2.application_code
             LEFT JOIN global.user_attributes ua ON ua.user_code = um.user_code AND ua.attribute_name::text = 'custom_attributes'::text
          WHERE um.is_deleted is false and um.status is true) a
  ORDER BY a.user_code;