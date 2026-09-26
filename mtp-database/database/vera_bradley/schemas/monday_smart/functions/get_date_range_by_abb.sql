--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:date_range_mondaysmart_update_22nov24_2_revert runOnChange:true stripComments:false splitStatements:false context:vb_data_range_function labels:vb_data_range_function
--comment: Altering get_date_range_by_abb function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS monday_smart.get_date_range_by_abb(text);

CREATE OR REPLACE FUNCTION monday_smart.get_date_range_by_abb(input text)
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
      date = date('2023-05-27')
  ) y on x.fw_id = y.prev_fw
group by
  1,
  2,
  3;
elseif $1 = 'ld' then return query
select
  a.fw_start_date,
 a.fw_end_date,
  a.fiscal_year_week as start_fw,
  a.fiscal_year_week as end_fw
from
(
    select
      fiscal_year_week
      ,date as fw_start_date
      ,date as fw_end_date
    from
      global.fiscal_date_mapping
    where
      date = date('2023-05-27')-1
  ) as a
group by
  1,
  2,
  3,4;
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
  date = date('2023-05-27');
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
  date = date('2023-05-27');
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
  date = date('2023-05-27');
 elseif $1 = 'llw' then return query


select b.fw_start_date
,b.fw_end_date
,b.start_fw
,b.end_fw
from
(
select
--fw_start_date,fw_end_date
last_to_last_fiscal_week as start_fw
,last_to_last_fiscal_week as end_fw
,min(fdm."date") as fw_start_date
,max(fdm."date") as fw_end_date
from
(
select
fdm.fiscal_year_week
,min(fdm.fiscal_week_begin_date) as   fw_start_date
,min(fdm.fiscal_week_end_date) as  fw_end_date
,lag(fdm.fiscal_year_week ,2)  over(order by fdm.fiscal_year_week) as last_to_last_fiscal_week
from "global".fiscal_date_mapping fdm
where fdm.date >=date('2023-05-27')-100 and fdm.date <=date('2023-05-27')
group by 1
order by 1 desc
) as a
join "global".fiscal_date_mapping fdm
  on fdm.fiscal_year_week =a.last_to_last_fiscal_week
  group by 1,2
  order by 1 desc
limit 1
) b

;


 elseif $1 = 'trailing_13_weeks' then return query

select

min(a.start_date) as fw_start_date
,max(a.end_date) as fw_end_date
,min(a.fiscal_year_week) as start_fw
,max(a.fiscal_year_week) as end_fw

from
(
select
distinct fiscal_year_week ,(fiscal_week_begin_date) as start_date ,fiscal_week_end_date as end_date
from "global".fiscal_date_mapping fdm
where date>=date('2023-05-27')-1000 and date<=date('2023-05-27')-7
group by 1,2,3
order by 1 desc
limit 13
) as a
;


end if;
end $function$
;
