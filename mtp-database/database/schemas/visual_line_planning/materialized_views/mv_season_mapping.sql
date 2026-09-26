--liquibase formatted sql
--changeset liquibase:mv_season_mapping_1_4 stripComments:false runOnChange:true splitStatements:false context:Release_1_4 labels:New_Approach_of_MV_1_4
--comment: initial changeset for mv_season_mapping_1_4
DROP MATERIALIZED VIEW IF EXISTS visual_line_planning.mv_season_mapping CASCADE;
CREATE MATERIALIZED VIEW visual_line_planning.mv_season_mapping
AS WITH change_points AS (
         SELECT calendar_fiscal.calendar_date AS d,
            calendar_fiscal.season,
                CASE
                    WHEN calendar_fiscal.season::text <> lag(calendar_fiscal.season) OVER (ORDER BY calendar_fiscal.calendar_date)::text THEN 1
                    ELSE 0
                END AS new_flag
           FROM visual_line_planning.calendar_fiscal
        ), islands AS (
         SELECT change_points.d,
            change_points.season,
            sum(change_points.new_flag) OVER (ORDER BY change_points.d) AS grp
           FROM change_points
        )
 SELECT season,
    min(d) AS season_start,
    max(d) AS season_end
   FROM islands
  GROUP BY grp, season
  ORDER BY (min(d))
WITH DATA;
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_season_mapping_season_start ON visual_line_planning.mv_season_mapping (season_start);
