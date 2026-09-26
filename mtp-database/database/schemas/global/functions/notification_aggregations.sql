--liquibase formatted sql
--changeset liquibase:notification_aggregations runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_aggregations
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.notification_aggregations(input character varying[], character varying);
CREATE OR REPLACE FUNCTION global.notification_aggregations(input character varying[], character varying)
 RETURNS TABLE(department jsonb)
 LANGUAGE plpgsql
AS $function$ 
/*  
 * Function/Procedure name: global.notification_aggregations
 * Created by: Kailash Yadav
 * Created at: 10-Dec-2021
 * No of input parameter: 2
 * Parameter Description : $1 = list of product code/store code/dc code/fc code/style code/product group etc.
 *                         $2 = string as product/store/fc/dc/style/pg. 
 * Purpose: This function been created to provide the list of department nad product code for given product/store/fc/dc/style/pg. 
 * Calling Statement:   
 *  select * from global.notification_aggregations( '{190276165548, 190276166644}', 'product')
 *. SELECT * from global.notification_aggregations( '{190335, 190339, 190341, 190435}', 'style')
 *. SELECT * from global.notification_aggregations( '{158}', 'pg')
 *. SELECT * from global.notification_aggregations( '{USRO0115, USRO0100, USRO0007, USRO0072, USRO0071}', 'store')
 *. SELECT * from global.notification_aggregations( '{29, 4, 5, 9, 30, 20, 3, 6}', 'dc')
 *  SELECT * from global.notification_aggregations( '{18, 2, 3, 4, 5, 11}', 'fc')
 *  
 * if any modification done in same function/procedure please record the changes in below format
 * 
 * Updated_by       Updated_on      Purpose
 * ----------       -----------     --------
 * Ashish Gupta    23-Dec-2021:    Formatting and code upgrade. 
 * Pradeep		   26-May-2022:    Added marksmart upload case   
 */
declare _query_combine text := '';
begin
if lower($2 :: varchar) = 'product' then return query 
select 
  jsonb_object_agg(dept, product_codes) 
from 
  (
    select 
      d.dept, 
      array_agg(distinct product_code) as product_codes 
    from 
      (
        select 
          product_code, 
          attribute_value as dept 
        from 
          global.product_attributes 
        where 
          attribute_name = 'l0_name'
      ) d 
    where 
      d.product_code = any($1) 
    group by 
      d.dept
  ) x;
elseif lower($2 :: varchar) = 'store' then return query 
select 
  jsonb_object_agg(chl, store_codes) 
from 
  (
    select 
      d.chl, 
      array_agg(distinct store_code) as store_codes 
    from 
      (
        select 
          store_code, 
          attribute_value as chl 
        from 
          global.store_attributes 
        where 
          attribute_name = 'channel'
      ) d 
    where 
      d.store_code = any($1) 
    group by 
      d.chl
  ) x;
elseif lower($2 :: varchar) = 'dc' then return query 
select 
  jsonb_object_agg(chl, store_codes) 
from 
  (
    select 
      d.chl, 
      array_agg(distinct d.store_code) as store_codes 
    from 
      (
        select 
          store_code, 
          attribute_value as chl 
        from 
          global.store_attributes 
        where 
          attribute_name = 'channel'
      ) d 
      join (
        select 
          store_code 
        from 
          global.store_master 
        where 
          dc_code = any($1 :: int[])
      ) dc on d.store_code = dc.store_code 
    group by 
      d.chl
  ) x;
elseif lower($2 :: varchar) = 'fc' then return query 
select 
  jsonb_object_agg(chl, store_codes) 
from 
  (
    select 
      d.chl, 
      array_agg(distinct d.store_code) as store_codes 
    from 
      (
        select 
          store_code, 
          attribute_value as chl 
        from 
          global.store_attributes 
        where 
          attribute_name = 'channel'
      ) d 
      join (
        select 
          store_code 
        from 
          global.store_master 
        where 
          fc_code = any($1 :: int[])
      ) fc on d.store_code = fc.store_code 
    group by 
      d.chl
  ) x;
elseif lower($2 :: varchar) = 'style' then return query 
select 
  jsonb_object_agg(dept, product_codes) 
from 
  (
    select 
      d.dept, 
      array_agg(distinct d.product_code) as product_codes 
    from 
      (
        select 
          product_code, 
          attribute_value as dept 
        from 
          global.product_attributes 
        where 
          attribute_name = 'l0_name'
      ) d 
      join (
        select 
          product_code, 
          attribute_value as dept 
        from 
          global.product_attributes 
        where 
          attribute_name = 'style' 
          and attribute_value = any($1)
      ) s on d.product_code = s.product_code 
    group by 
      d.dept
  ) x;
elsif lower($2 :: varchar) = 'pg' then return query 
select 
  jsonb_object_agg(dept, product_codes) 
from 
  (
    select 
      d.dept, 
      array_agg(distinct d.product_code) as product_codes 
    from 
      (
        select 
          product_code, 
          attribute_value as dept 
        from 
          global.product_attributes 
        where 
          attribute_name = 'l0_name'
      ) d 
      join (
        select 
          product_code 
        from 
          global.product_groups_mapping 
        where 
          pg_code = any($1 :: int4[])
      ) pgm on d.product_code = pgm.product_code 
    group by 
      d.dept
  ) x;
elsif lower($2 :: varchar) = 'sg' then return query 
select 
  jsonb_object_agg(chl, store_codes) 
from 
  (
    select 
      d.chl, 
      array_agg(distinct d.store_code) as store_codes 
    from 
      (
        select 
          store_code, 
          attribute_value as chl 
        from 
          global.store_attributes 
        where 
          attribute_name = 'channel'
      ) d 
      join (
        select 
          store_code 
        from 
          global.store_groups_mapping 
        where 
          sg_code = any($1 :: int4[])
      ) sgm on d.store_code = sgm.store_code 
    group by 
      d.chl
  ) x;
 elsif lower($2 :: varchar) = 'gcs_upload' then return query
 	select  jsonb_object_agg('l0_name', array_to_json($1::text[]));
end if;
end $function$
;
