--liquibase formatted sql
--changeset mayank.mukundam:allocation_filter_facility_eligibility_mv stripComments:false runOnChange:true splitStatements:false context:Release_1_1 labels:allocation_filter_facility_eligibility_mv
--comment: initial changeset for allocation_filter_facility_eligibility_mv

DROP MATERIALIZED VIEW IF EXISTS source_smart.allocation_filter_facility_eligibility_mv CASCADE;

CREATE MATERIALIZED VIEW source_smart.allocation_filter_facility_eligibility_mv
TABLESPACE pg_default
AS WITH afd AS (
         SELECT af.filter_id,
            fgm.facility_id
           FROM source_smart.allocation_filters af
             JOIN source_smart.facility_group_master fgm ON af.facility_group_id::text = fgm.facility_group_id::text
        )
 SELECT afd.filter_id,
    afd.facility_id,
    sfm.style_color_id,
    gft.season_id,
    gft.dc_code,
    gft.forecast_quantity
   FROM source_smart.stylecolor_facility_mapping sfm
     JOIN afd ON afd.facility_id::text = sfm.facility_id::text
     JOIN source_smart.granular_forecast_table gft ON gft.style_color_id::text = sfm.style_color_id::text
  WHERE sfm.facility_tier2_eligibility::text = 'Y'::text AND gft.forecast_quantity > 0
WITH DATA;

CREATE UNIQUE INDEX idx_affe_unique ON source_smart.allocation_filter_facility_eligibility_mv USING btree (filter_id, style_color_id, dc_code, facility_id, forecast_quantity, season_id);