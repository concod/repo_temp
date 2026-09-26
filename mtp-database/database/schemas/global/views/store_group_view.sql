--liquibase formatted sql
--changeset shreeraksha:store_group_view_new runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-85048
--comment: initial changeset for store group view with updated source code
--rollback: SELECT 1
DROP VIEW IF EXISTS "global".store_group_view;
CREATE OR REPLACE VIEW "global".store_group_view
AS SELECT store_groups.sg_code,
    store_groups.name,
    store_groups.special_classification,
    store_groups.is_deleted,
    store_groups.created_at,
    store_groups.updated_at,
    store_groups.created_by,
    store_groups.updated_by,
    store_groups.application_code,
    store_groups.extra,
        CASE
            WHEN store_groups.extra -> 'channels' IS NOT NULL THEN unnested_channels.channel::character varying
            ELSE store_groups.channel
        END AS channel
   FROM global.store_groups
     LEFT JOIN LATERAL ( SELECT jsonb_array_elements_text(store_groups.extra -> 'channels'::text) AS channel
          WHERE store_groups.extra -> 'channels' IS NOT NULL) unnested_channels ON true;