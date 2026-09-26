
---- Start for backup for 2 days

DROP SNAPSHOT TABLE if exists impactsmart.puma_ingestion_dev.ada_visual_predictions_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.puma_ingestion_dev.ada_visual_predictions_bkp
CLONE impactsmart.puma_ingestion_dev.ada_visual_predictions
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions",
  description="A table snapshot that expires in 2 days"
);




DROP SNAPSHOT TABLE if exists impactsmart.puma_ingestion_dev.ada_visual_actuals_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.puma_ingestion_dev.ada_visual_actuals_bkp
CLONE impactsmart.puma_ingestion_dev.ada_visual_actuals
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);

---- Start for backup for 2 days



/*

DROP SNAPSHOT TABLE if exists impactsmart.puma_ingestion_dev.ada_visual_predictions_hist_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.puma_ingestion_dev.ada_visual_predictions_hist_bkp
CLONE impactsmart.puma_ingestion_dev.ada_visual_predictions_hist
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);


INSERT INTO
  impactsmart.puma_ingestion_dev.ada_visual_predictions_hist (product_code,
    store_code,
    fiscal_date,
    fiscal_year_week,
    merchandise_category,
    predicted_qty,
    adjusted_forecast_qty,
    promo_percentage,
    default_discount_flag,
    adjusted_discount_flag,
    fiscal_year_quarter,
    fiscal_year_month,
    updated_by,
    updated_at,
    snapshot_week) 
  SELECT
    product_code,
    store_code,
    fiscal_date,
    fiscal_year_week,
    merchandise_category,
    predicted_qty,
    adjusted_forecast_qty,
    promo_percentage,
    default_discount_flag,
    adjusted_discount_flag,
    fiscal_year_quarter,
    fiscal_year_month,
    updated_by,
    updated_at,
    (select fiscal_year_week-1 from impactsmart.puma_ingestion_dev.fiscal_date_mapping where date = current_date()) as snapshot_week
  FROM
    `impactsmart.puma_ingestion_dev.ada_visual_predictions`a
   where  
  a.fiscal_year_week >= (select fiscal_year_week-1 from impactsmart.puma_ingestion_dev.fiscal_date_mapping where date = current_date()) 
and a.fiscal_year_week <= (select MAX(fiscal_year_week)-1 from (select DISTINCT fiscal_year_week from impactsmart.puma_ingestion_dev.fiscal_date_mapping where date >= CURRENT_DATE() order by fiscal_year_week limit 8) x ) 
and adjusted_discount_flag =true 
and a.fiscal_year_week !=1;
*/

DROP TABLE IF EXISTS
  impactsmart.puma_ingestion_dev.ada_visual_predictions_retain;

CREATE TABLE
  impactsmart.puma_ingestion_dev.ada_visual_predictions_retain AS
SELECT
  adjusted_forecast_qty,
  predicted_qty,
  promo_percentage,
  default_discount_flag,
  adjusted_discount_flag,
  fiscal_year_week,
  fiscal_date,
  product_code,
  store_code,
    updated_by,
    updated_at
FROM
  impactsmart.puma_ingestion_dev.ada_visual_predictions
WHERE
  fiscal_year_week !=0
  AND adjusted_discount_flag = TRUE and (updated_by is not null or updated_at is not null);

  DROP table `impactsmart.puma_ingestion_dev.ada_visual_predictions`;


  
  CREATE TABLE
  `impactsmart.puma_ingestion_dev.ada_visual_predictions` (product_code		STRING	NOT NULL,
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
            CLUSTER BY   adjusted_discount_flag, default_discount_flag,  product_bucket_code,promo_percentage 
            OPTIONS(
              require_partition_filter=true
            )AS 
      SELECT
  a.product_code,
  a.store_code,
  a.fiscal_date,
  a.fiscal_year_week,
  a.predicted_qty predicted_qty,
  a.predicted_qty adjusted_forecast_qty,
  a.promo_percentage,
  ---case when a.promo_percentage>0 then round(a.promo_percentage*100,2) else a.promo_percentage end as promo_percentage,
  a.default_discount_flag as default_discount_flag,
  a.adjusted_discount_flag AS adjusted_discount_flag,
  d.fiscal_year_quarter fiscal_year_quarter,
  d.fiscal_year_month fiscal_year_month,
  a.predicted_qty_round predicted_qty_round,
  NULL,
  NULL,
  product_bucket_code,
  CURRENT_DATETIME() as created_at,
  SESSION_USER() as created_by,
  FALSE is_deleted
FROM
  `impactsmart.puma_ingestion_dev.ada_sim_out_active` a
JOIN
  impactsmart.puma_ingestion_dev.product_master b
ON
  a.product_code=b.product_code
JOIN
  impactsmart.puma_ingestion_dev.store_master c
ON
  a.store_code = c.store_code
JOIN
  impactsmart.puma_ingestion_dev.fiscal_date_mapping d
ON
  d.fiscal_year_week =a.fiscal_year_week
  AND a.fiscal_date = d.date ;
  
  
   update impactsmart.puma_ingestion_dev.ada_visual_predictions  ss
 set  ss.adjusted_discount_flag = false,
    ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
  from (
    select distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,updated_by, updated_at  
  from impactsmart.puma_ingestion_dev.ada_visual_predictions_retain aa where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;

 
update impactsmart.puma_ingestion_dev.ada_visual_predictions  ss
set ss.adjusted_forecast_qty = aa.adjusted_forecast_qty , ss.adjusted_discount_flag = aa.adjusted_discount_flag
,
 ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
from (
 select  distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,aa.promo_percentage,aa.adjusted_forecast_qty,
 aa.adjusted_discount_flag,
 updated_by, updated_at  
  from impactsmart.puma_ingestion_dev.ada_visual_predictions_retain aa where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.promo_percentage =aa.promo_percentage
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;
  
  drop table if  exists `impactsmart.puma_ingestion_dev.ada_visual_product_store_mapping`;

   create table  `impactsmart.puma_ingestion_dev.ada_visual_product_store_mapping`
           PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
                CLUSTER BY  fiscal_year_week, store_code , product_code
                   as 
          select distinct product_code, store_code, fiscal_year_week from  `impactsmart.puma_ingestion_dev.ada_visual_predictions` where fiscal_year_week !=1;

  
--delete from impactsmart.puma_ingestion_dev.ada_visual_actuals where fiscal_year_week !=1;

drop table if exists impactsmart.puma_ingestion_dev.ada_visual_actuals;

create table if not exists impactsmart.puma_ingestion_dev.ada_visual_actuals
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
            CLUSTER BY product_bucket_code, store_code, product_code
            OPTIONS(
              require_partition_filter=true
            ) 
            as (
                SELECT        
                prd.product_code,
                store_code,
                fsc.fiscal_year_week,
                fsc.fiscal_year_month,
                fsc.fiscal_year_quarter,
                fsc.fiscal_year,
                SUM(qty) AS qty,
                ROUND(SAFE_DIVIDE(SUM(qty*txn.price),SUM(qty)),2) AS price,
                ROUND(SAFE_DIVIDE(SUM(qty*txn.cost),SUM(qty)),2) AS cost,
                cast (discount_amount as float64) AS discount_amount,
                COUNT(DISTINCT transaction_code) AS txn_count,
                 prd.product_bucket_code
                      FROM
                        `impactsmart.puma_ingestion_dev.transaction_master` txn
                      LEFT JOIN
                        `impactsmart.puma_ingestion_dev.fiscal_date_mapping` fsc
                      USING
                        (date)
                      LEFT JOIN
                        `impactsmart.puma_ingestion_dev.product_master` prd
                      USING
                        (product_code)
                      LEFT JOIN
                        `impactsmart.puma_ingestion_dev.store_master` str
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
                        discount_amount,
                         prd.product_bucket_code);
    
    