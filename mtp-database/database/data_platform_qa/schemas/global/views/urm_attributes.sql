--liquibase formatted sql
--changeset liquibase:urm_attributes runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for urm_attributes
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".urm_attributes;
CREATE OR REPLACE VIEW "global".urm_attributes
AS SELECT x.user_code,
    x.attribute_name,
    x.attribute_value
   FROM ( SELECT user_master.user_code,
            'user_name'::text AS attribute_name,
            user_master.user_name AS attribute_value
           FROM global.user_master
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'channel'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'channel'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l0_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l0_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l1_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l1_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l2_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l2_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l3_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l3_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l4_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l4_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l5_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l5_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l6_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l6_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l7_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l7_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy
        UNION ALL
         SELECT DISTINCT uahm.user_code,
            'l8_name'::text AS attribute_name,
            jsonb_array_elements(uahm.access_hierarchy) ->> 'l8_name'::text AS attribute_value
           FROM global.user_access_hierarchy_mapping uahm
          GROUP BY uahm.user_code, uahm.access_hierarchy) x
  GROUP BY x.user_code, x.attribute_name, x.attribute_value;
