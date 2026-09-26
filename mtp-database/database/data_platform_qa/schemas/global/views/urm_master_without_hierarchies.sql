--liquibase formatted sql
--changeset gautam.baruah@impactanalytics.co:urm_master_without_hierarchies runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp_39323
--comment: added an updated urm master view without fetching the access_hierarchy column
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".urm_master_without_hierarchies;
CREATE OR REPLACE VIEW "global".urm_master_without_hierarchies
AS SELECT a.user_code,
    a.user_name,
    a.name,
    a.application_name,
    a.role_name,
    a.role_code,
    a.action_code,
    a.screen_name AS screen,
	a.custom_attributes,
    a.email,
    a.hierarchy_id,
    a.hierarchy_present
   FROM ( SELECT um.user_code,
            um.user_name,
            um.name,
            um.email,
            am2.name AS application_name,
            rm.name AS role_name,
            rm.role_code,
            rm.action_code,
            sm.screen_name,
            ua.attribute_value AS custom_attributes,
            uahm.hierarchy_id,
            CASE 
        	WHEN uahm.access_hierarchy IS NOT NULL AND uahm.access_hierarchy != '[]' THEN TRUE
        	ELSE FALSE
    		END AS hierarchy_present
            FROM global.user_master um
             LEFT JOIN global.user_access_hierarchy_mapping uahm ON um.user_code = uahm.user_code
             LEFT JOIN global.acl_master am ON am.acl_code = uahm.acl_code
             LEFT JOIN global.screen_master sm ON sm.screen_code = am.screen_code
             LEFT JOIN global.roles_master rm ON am.role_code = rm.role_code
             LEFT JOIN global.application_master am2 ON am.application_code = am2.application_code
             LEFT JOIN global.user_attributes ua ON ua.user_code = um.user_code AND ua.attribute_name::text = 'custom_attributes'::text
          WHERE um.is_deleted IS FALSE AND um.status IS TRUE) a
  ORDER BY a.user_code;
