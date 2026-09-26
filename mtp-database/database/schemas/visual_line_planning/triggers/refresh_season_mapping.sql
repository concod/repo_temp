
--liquibase formatted sql
--changeset shannon.dmello:refresh_season_mapping_1_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_2 labels:refresh_season_mapping_1_2
--comment: initial changeset for refresh_season_mapping_1_2

CREATE OR REPLACE FUNCTION visual_line_planning.refresh_season_mapping()
RETURNS trigger 
SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY visual_line_planning.mv_season_mapping;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_refresh_season_mapping
AFTER INSERT OR UPDATE OR DELETE ON visual_line_planning.calendar_fiscal
FOR EACH STATEMENT EXECUTE FUNCTION visual_line_planning.refresh_season_mapping();
