--liquibase formatted sql
--changeset liquibase:getcaltofisweek runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for getcaltofisweek
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.getcaltofisweek();
CREATE OR REPLACE FUNCTION global.getcaltofisweek()
 RETURNS TABLE(f_data json)
 LANGUAGE plpgsql
AS $function$ begin return QUERY with temp as (
  with fiscal_temp as (
    select 
      cal_week, 
      fis_week, 
      cal_year, 
      fis_year, 
      count_week, 
      rank () over (
        partition by cal_week, 
        cal_year 
        order by 
          count_week desc
      ) as rank_no 
    from 
      (
        select 
          distinct(
            extract(
              week 
              from 
                date
            )
          ) as cal_week, 
          fw as fis_week, 
          date_part('isoyear', date) as cal_year, 
          fy as fis_year, 
          count(
            extract(
              week 
              from 
                date
            )
          ) as count_week 
        from 
          "global".fc_fy_fw_level 
        group by 
          cal_week, 
          fis_week, 
          cal_year, 
          fis_year 
        order by 
          cal_year desc
      ) as fis
  ) 
  select 
    fiscal_temp.cal_year, 
    json_build_object(
      'cw', fiscal_temp.cal_week, 'fy', 
      fiscal_temp.fis_year, 'fw', fiscal_temp.fis_week
    ) as fiscal_obj 
  from 
    fiscal_temp 
  where 
    rank_no = 1 
  order by 
    cal_year, 
    cal_week
) 
select 
  json_build_object(
    temp.cal_year, 
    array_agg(fiscal_obj)
  ) as f_data 
from 
  temp 
group by 
  temp.cal_year;
end $function$
;
