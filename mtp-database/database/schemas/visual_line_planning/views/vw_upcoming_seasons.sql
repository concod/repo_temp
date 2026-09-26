--liquibase formatted sql
--changeset liquibase:vw_upcoming_seasons_1_1 stripComments:false splitStatements:false runOnChange:true context:Release_1_1 labels:liquibase_project_start_1_1
--comment: initial changeset for vw_upcoming_seasons_1_1
DROP VIEW IF EXISTS visual_line_planning.vw_upcoming_seasons;
CREATE OR REPLACE VIEW visual_line_planning.vw_upcoming_seasons
AS SELECT DISTINCT (season::text || ' '::text) || EXTRACT(year FROM season_start) AS season_year,
    season_start,
    season_end
   FROM visual_line_planning.mv_season_mapping s
  WHERE season_start >= (( SELECT COALESCE(min(
                CASE
                    WHEN CURRENT_DATE >= mv_season_mapping.season_start AND CURRENT_DATE <= mv_season_mapping.season_end THEN mv_season_mapping.season_start
                    ELSE NULL::date
                END), min(
                CASE
                    WHEN mv_season_mapping.season_start > CURRENT_DATE THEN mv_season_mapping.season_start
                    ELSE NULL::date
                END)) AS "coalesce"
           FROM visual_line_planning.mv_season_mapping))
  ORDER BY season_start;