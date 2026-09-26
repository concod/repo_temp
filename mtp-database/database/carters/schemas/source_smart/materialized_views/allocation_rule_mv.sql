--liquibase formatted sql
--changeset mayank.mukundam:allocation_rule_mv stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:allocation_rule_mv
--comment: initial changeset for allocation_rule_mv

DROP MATERIALIZED VIEW IF EXISTS source_smart.allocation_rule_mv CASCADE;

CREATE MATERIALIZED VIEW source_smart.allocation_rule_mv
TABLESPACE pg_default
AS WITH best_priorities AS (
         SELECT allocation_rules_mapping.style_color_id,
            allocation_rules_mapping.dc_code,
            min(allocation_rules_mapping.priority) AS best_priority,
            allocation_rules_mapping.rule_id
           FROM source_smart.allocation_rules_mapping
          GROUP BY allocation_rules_mapping.style_color_id, allocation_rules_mapping.dc_code, allocation_rules_mapping.rule_id
        )
 SELECT DISTINCT r.style_color_id,
    r.dc_code,
    r.rule_id,
    r.rcl_id,
    r.priority
   FROM source_smart.allocation_rules_mapping r
     JOIN best_priorities bp ON r.style_color_id::text = bp.style_color_id::text AND r.dc_code::text = bp.dc_code::text AND r.priority = bp.best_priority
WITH DATA;

-- View indexes:
CREATE UNIQUE INDEX allocation_rule_mv_pkey ON source_smart.allocation_rule_mv USING btree (style_color_id, dc_code, rcl_id, rule_id);
CREATE INDEX allocation_rule_mv_rcl_id_idx ON source_smart.allocation_rule_mv USING btree (rcl_id, rule_id);