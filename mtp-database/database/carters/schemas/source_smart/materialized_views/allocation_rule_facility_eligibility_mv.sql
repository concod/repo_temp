--liquibase formatted sql
--changeset mayank.mukundam:allocation_rule_facility_eligibility_mv stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:Rule mapping for allocation
--comment: initial changeset for allocation_rule_facility_eligibility_mv

CREATE MATERIALIZED VIEW source_smart.allocation_rule_facility_eligibility_mv
TABLESPACE pg_default
AS WITH afd AS (
         SELECT DISTINCT af.filter_id,
            fgm.facility_id
           FROM source_smart.allocation_filters af
             JOIN source_smart.facility_group_master fgm ON af.facility_group_id::text = fgm.facility_group_id::text
        )
 SELECT DISTINCT ON (ar.rule_id, ar.rule_name, ar.allocation_filter_id, ar.style_color_id, ar.dc_stores, sfm.facility_id, sfm.facility_tier2_eligibility) ar.rule_id,
    ar.rule_name,
    ar.allocation_filter_id,
    ar.style_color_id,
    ar.dc_stores,
    sfm.facility_id,
    sfm.facility_tier2_eligibility
   FROM source_smart.allocation_rule ar
     JOIN source_smart.stylecolor_facility_mapping sfm ON sfm.style_color_id::text = ar.style_color_id::text
     JOIN afd ON afd.facility_id::text = sfm.facility_id::text AND afd.filter_id = ar.allocation_filter_id
  WHERE ar.style_color_id IS NOT NULL AND ar.dc_stores IS NOT NULL AND sfm.facility_tier2_eligibility::text = 'Y'::text
WITH DATA;

CREATE UNIQUE INDEX idx_arfe_unique ON source_smart.allocation_rule_facility_eligibility_mv USING btree (rule_id, rule_name, allocation_filter_id, style_color_id, dc_stores, facility_id, facility_tier2_eligibility);