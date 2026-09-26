--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:get_date_range_by_abb_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_2 labels:scarpe_test_freeze
--comment: date freeze on Scarpe test
--rollback: SELECT 1

DROP FUNCTION IF EXISTS "global".get_date_range_by_abb(text);

CREATE FUNCTION global.get_date_range_by_abb(input text)
 RETURNS TABLE(start_date date, end_date date, start_fw integer, end_fw integer)
 LANGUAGE plpgsql
AS $function$ begin if $1 = 'lw' then return QUERY 
select 
  fw_start_date, 
  fw_end_date, 
  x.fw_id as start_fw, 
  x.fw_id as end_fw 
from 
  global.fc_fy_fw_level x 
  join (
    select 
      prev_fw 
    from 
      global.fc_fy_fw_level 
    where 
      date = date'2026-01-17'
  ) y on x.fw_id = y.prev_fw 
group by 
  1, 
  2, 
  3;
elseif $1 = 'ytd' then return query 
select 
  fy_start_date, 
  fw_end_date, 
  (
    select 
      min(fw_id) 
    from 
      global.fc_fy_fw_level 
    where 
      fy = x.fy
  ) as start_fw, 
  fw_id 
from 
  global.fc_fy_fw_level x 
where 
  date = date'2026-01-17'-7;
elseif $1 = 'qtd' then return query 
select 
  fq_start_date, 
  fw_end_date, 
  (
    select 
      min(fw_id) 
    from 
      global.fc_fy_fw_level 
    where 
      fq_id = x.fq_id
  ) as start_fw, 
  fw_id 
from 
  global.fc_fy_fw_level x 
where 
  date = date'2026-01-17'-7;
elseif $1 = 'mtd' then return query 
select 
  fm_start_date, 
  fw_end_date, 
  (
    select 
      min(fw_id) 
    from 
      global.fc_fy_fw_level 
    where 
      fm_id = x.fm_id
  ) as start_fw, 
  fw_id 
from 
  global.fc_fy_fw_level x 
where 
  date = date'2026-01-17'-7;
 elseif $1 = 'std' then return query 
select 
  fs_start_date, 
  fw_end_date, 
  (
    select 
      min(fw_id) 
    from 
      global.fc_fy_fw_level 
    where 
      fs_id  = x.fs_id
  ) as start_fw, 
  fw_id 
from 
  global.fc_fy_fw_level x 
where 
  date = date'2026-01-17'-7;
end if;
end $function$
;
