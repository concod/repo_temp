/*
drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions;

create table impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions
copy impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions;

drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_hist;

create table impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_hist
copy impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_hist;

drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals;
create table impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals
copy impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals;

drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_product_store_mapping;
create table impactsmart-prod.rl_na_ingestion_prod.ada_visual_product_store_mapping
copy impactsmart-prod.rl_na_ingestion_prod.ada_visual_product_store_mapping;

drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_historical_dropdown;
create table impactsmart-prod.rl_na_ingestion_prod.ada_visual_historical_dropdown
copy impactsmart-prod.rl_na_ingestion_prod.ada_visual_historical_dropdown;
*/



DROP SNAPSHOT TABLE if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_bkp
CLONE impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions",
  description="A table snapshot that expires in 2 days"
);




DROP SNAPSHOT TABLE if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals_bkp
CLONE impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);

======================


drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_retain;

create table impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_retain
PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
  CLUSTER BY   fiscal_year_week,store_code , product_code,adjusted_discount_flag
  OPTIONS(
    require_partition_filter=true
  )
as  
select adjusted_forecast_qty,predicted_qty , promo_percentage, default_discount_flag,adjusted_discount_flag, fiscal_year_week , 
fiscal_date, product_code, store_code,
updated_by, updated_at  
  from impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions where fiscal_year_week !=0 and 
 adjusted_discount_flag = true and (updated_by is not null or updated_at is not null);
 
==================



  drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions;
  
     create table if not exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions
            ((product_code		STRING	NOT NULL,
          store_code		STRING NOT NULL,	
          fiscal_date		DATE	NOT NULL,
          fiscal_year_week		INTEGER	 NOT NULL,
          predicted_qty		FLOAT64 ,	
          adjusted_forecast_qty		FLOAT64 ,	
          promo_percentage		NUMERIC NOT NULL,	
          default_discount_flag		BOOLEAN	NOT NULL,
          adjusted_discount_flag		BOOLEAN NOT NULL,
          fiscal_year_quarter		INTEGER	 NOT NULL,
          fiscal_year_month		INTEGER	NOT NULL,
          predicted_qty_round		FLOAT64 ,
          updated_by  STRING,
          updated_at datetime,
          product_bucket_code INTEGER NOT NULL,     
          created_at datetime default CURRENT_DATETIME() NOT NULL,
          created_by STRING DEFAULT SESSION_USER() NOT NULL,
          is_deleted boolean default FALSE  NOT NULL  
            )
          PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
            CLUSTER BY   adjusted_discount_flag, default_discount_flag,  
            product_bucket_code,
            promo_percentage 
            OPTIONS(
              require_partition_filter=true
                )AS 
      SELECT
  a.product_code,
  cast (a.store_code as string) store_code,
  a.date fiscal_date,
  a.fiscal_year_week,
  a.day_pred predicted_qty,
  a.day_pred adjusted_forecast_qty,
  cast (a.promo_percentage as Numeric) promo_percentage,
  case when promo_percentage=20 then true else false end  default_discount_flag  ,
  case when promo_percentage=20 then true else false end  adjusted_discount_flag  ,
  d.fiscal_year_quarter fiscal_year_quarter,
  d.fiscal_year_month fiscal_year_month,
  a.day_pred_round predicted_qty_round,
  NULL,
  NULL,
  product_bucket_code,
  CURRENT_DATETIME() as created_at,
  SESSION_USER() as created_by,
  FALSE is_deleted
FROM `impactsmart.rl_na_ingestion_dev.sim_result_202409_202434_modelled_unmodelled_final_formatted` a
JOIN `impactsmart-prod.rl_na_ingestion_prod.product_master` b
ON a.product_code=b.product_code
JOIN impactsmart-prod.rl_na_ingestion_prod.store_master c
ON cast (a.store_code as string) = c.store_code
JOIN impactsmart-prod.rl_na_ingestion_prod.fiscal_date_mapping d
ON a.date = d.date
and a.fiscal_year_week >=202409
--(select fiscal_year_week from impactsmart-prod.rl_na_ingestion_prod.fiscal_date_mapping where date = current_date())
;


 --- Below script to update to retain updated value by tool.

update impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions  ss
 set  ss.adjusted_discount_flag = false,
    ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
  from (
    select distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,updated_by, updated_at  
  from impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_retain aa where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;

 
update impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions  ss
set ss.adjusted_forecast_qty = aa.adjusted_forecast_qty , ss.adjusted_discount_flag = aa.adjusted_discount_flag
,
 ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
from (
 select  distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,aa.promo_percentage,aa.adjusted_forecast_qty,
 aa.adjusted_discount_flag,
 updated_by, updated_at  
  from impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions_retain aa where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.promo_percentage =aa.promo_percentage
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;
  

  drop table if  exists `impactsmart-prod.rl_na_ingestion_prod.ada_visual_product_store_mapping`;

   create table  `impactsmart-prod.rl_na_ingestion_prod.ada_visual_product_store_mapping`
           PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
                CLUSTER BY  fiscal_year_week, store_code , product_code
                   as 
          select distinct product_code, store_code, fiscal_year_week from  `impactsmart-prod.rl_na_ingestion_prod.ada_visual_predictions` where fiscal_year_week !=1;


==========
  drop table if exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals;

create table if not exists impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals
( product_code		STRING	NOT NULL,
  store_code		STRING NOT NULL,	
 fiscal_year_week		INTEGER	 NOT NULL,
 fiscal_year_month		INTEGER	NOT NULL,
 fiscal_year_quarter		INTEGER	 NOT NULL,
 fiscal_year INTEGER	 NOT NULL,
 qty                     float64, 
 price                   float64, 
 cost float64, 
 discount_amount float64, 
 txn_count INTEGER,
 product_bucket_code INTEGER NOT NULL
  )
          PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
            CLUSTER BY product_bucket_code, 
            store_code, product_code
            OPTIONS(
              require_partition_filter=true
            ) ;


  INSERT INTO
  impactsmart-prod.rl_na_ingestion_prod.ada_visual_actuals( product_code,
    store_code,
    fiscal_year_week,
    qty,
     price,
    cost,
    discount_amount,
    txn_count,
    fiscal_year_quarter,
    fiscal_year_month,
    fiscal_year,
    product_bucket_code
     ) 
             (
  SELECT
    prd.product_code,
    store_code,
    fiscal_year_week,
    SUM(qty) AS qty,
    ROUND(SAFE_DIVIDE(SUM(qty*1),SUM(qty)),2) AS price,
    ROUND(SAFE_DIVIDE(SUM(qty*txn.cost),SUM(qty)),2) AS cost,
    ROUND(SAFE_DIVIDE(SUM(qty*discount_amount),SUM(qty)),2) AS discount_amount,
    COUNT(DISTINCT transaction_code) AS txn_count,
    fiscal_year_quarter,
    fiscal_year_month,
    fsc.fiscal_year
    ,prd.product_bucket_code
  FROM
    `impactsmart-prod.rl_na_ingestion_prod.transaction_master` txn
  LEFT JOIN
    `impactsmart-prod.rl_na_ingestion_prod.fiscal_date_mapping` fsc
  USING
    (date)
  LEFT JOIN
    `impactsmart-prod.rl_na_ingestion_prod.product_master` prd
  USING
    (product_code)
  LEFT JOIN
    `impactsmart-prod.rl_na_ingestion_prod.store_master` str
  USING
    (store_code)
   where prd.product_code is not null  
  GROUP BY
    prd.product_code,
    store_code,
    fiscal_year_week,
    fiscal_year_quarter,
    fiscal_year_month,
    fsc.fiscal_year,
    prd.product_bucket_code
     );