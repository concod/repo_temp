DROP SNAPSHOT TABLE if exists impactsmart.signet_ingestion_zpb.ada_visual_predictions_daily_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.signet_ingestion_zpb.ada_visual_predictions_daily_bkp
CLONE impactsmart.signet_ingestion_zpb.ada_visual_predictions
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 12 HOUR),
  friendly_name="ada_visual_predictions",
  description="A table snapshot that expires in 12 HOUR"
);


DROP SNAPSHOT TABLE if exists impactsmart.signet_ingestion_zpb.ada_visual_actuals_daily_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.signet_ingestion_zpb.ada_visual_actuals_daily_bkp
CLONE impactsmart.signet_ingestion_zpb.ada_visual_actuals
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 12 HOUR),
  friendly_name="ada_visual_actuals",
  description="A table snapshot that expires in 12 HOUR"
);

 
 
        
       
drop table if exists impactsmart.signet_ingestion_zpb.ada_visual_predictions_daily_retain;


create table if not exists impactsmart.signet_ingestion_zpb.ada_visual_predictions_daily_retain
PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
  CLUSTER BY   fiscal_year_week,store_code , product_code,adjusted_discount_flag
  OPTIONS(
    require_partition_filter=true
  )
as  
select adjusted_forecast_qty,predicted_qty , promo_percentage, default_discount_flag,adjusted_discount_flag, fiscal_year_week , 
fiscal_date, product_code, store_code,
updated_by, updated_at  
  from impactsmart.signet_ingestion_zpb.ada_visual_predictions a
  where fiscal_year_week !=0 and 
 adjusted_discount_flag = true and (updated_by is not null or updated_at is not null)
 and product_code in (select distinct product_code from  `impactsmart.signet_base_tables.ada_sim_out_active_uat_ds` where fiscal_year_week!=1)
 ;
 
 /*
---To check 
  select count(distinct a.product_code|| a.fiscal_year_week) from `impactsmart.signet_ingestion_zpb.ada_visual_predictions` a
  where fiscal_year_week !=1
  and exists 
  (select 'p' From `impactsmart.signet_base_tables.ada_sim_out_active_uat_ds` b
  join `impactsmart.signet_ingestion.product_master` pm
  on b.product_code =pm.product_code
  where 
  fiscal_year_week !=1
  and a.product_bucket_code = pm.product_bucket_code
  and a.product_code = pm.product_code
  and a.fiscal_year_week = b.fiscal_year_week
  )*/
 
 
  delete  from `impactsmart.signet_ingestion_zpb.ada_visual_predictions` a
  where fiscal_year_week !=1
  and exists 
  (select 'p' From `impactsmart.signet_base_tables.ada_sim_out_active_uat_ds` b
  join `impactsmart.signet_ingestion.product_master` pm
  on b.product_code =pm.product_code
  where 
  fiscal_year_week !=1
  and a.product_bucket_code = pm.product_bucket_code
  and a.product_code = pm.product_code
  and a.fiscal_year_week = b.fiscal_year_week
  )
  ;
  
  
     insert into impactsmart.signet_ingestion_zpb.ada_visual_predictions
            (product_code		,
          store_code		,	
          fiscal_date		,
          fiscal_year_week	,
          predicted_qty		 ,	
          adjusted_forecast_qty	 ,	
          promo_percentage		,	
          default_discount_flag		,
          adjusted_discount_flag	,
          fiscal_year_quarter		,
          fiscal_year_month		,
          predicted_qty_round		,
          updated_by  ,
          updated_at ,
          product_bucket_code ,     
          created_at  ,
          created_by  ,
          is_deleted   
            )
     SELECT
  a.product_code,
  a.store_code,
  a.dates fiscal_date,
  a.fiscal_year_week,
  a.day_pred predicted_qty,
  a.day_pred adjusted_forecast_qty,
  a.promo_percentage,
  CASE WHEN a.promo_percentage =ds.final_discount THEN TRUE ELSE FALSE END AS default_discount_flag,
  CASE WHEN a.promo_percentage =ds.final_discount THEN TRUE ELSE FALSE END AS adjusted_discount_flag,
  d.fiscal_year_quarter fiscal_year_quarter,
  d.fiscal_year_month fiscal_year_month,
  a.day_pred_round predicted_qty_round,
  NULL,
  NULL,
  product_bucket_code,
  CURRENT_DATETIME() as created_at,
  SESSION_USER() as created_by,
  FALSE is_deleted
FROM `impactsmart.signet_base_tables.ada_sim_out_active_uat_ds` a
JOIN `impactsmart.signet_ingestion_zpb.product_master` b
ON a.product_code=b.product_code
JOIN impactsmart.signet_ingestion_zpb.store_master c
ON a.store_code = c.store_code
JOIN impactsmart.signet_ingestion_zpb.fiscal_date_mapping d
ON a.dates = d.date
left join (select distinct final_store_code,store_channel , 1 as ecom_flag from impactsmart.signet_ingestion_zpb.ecom_store_mapping_table) e
on a. store_code = e.final_store_code
LEFT JOIN (
  SELECT
    hierarchy_3,
    fiscal_year_week,
    channel,
    CAST(final_discount AS integer) AS final_discount
  FROM
    `impactsmart.signet_ingestion_zpb.discount_selection`
    ) ds
ON
  b.hierarchy_3 =ds.hierarchy_3
  and (case when e.ecom_flag is null then c.channel else e.store_channel end) = ds.channel
  AND a.fiscal_year_week = ds.fiscal_year_week  
  where  a.fiscal_year_week !=1
        ;
    
   
--- Below script to update to retain updated value by tool.

update impactsmart.signet_ingestion_zpb.ada_visual_predictions  ss
 set  ss.adjusted_discount_flag = false,
    ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
  from (
    select distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,updated_by, updated_at  , pm.product_bucket_code
  from impactsmart.signet_ingestion_zpb.ada_visual_predictions_daily_retain aa 
  join impactsmart.signet_ingestion_zpb.product_master pm
  on aa.product_code =pm.product_code
  where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.product_bucket_code =aa.product_bucket_code
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;

 
update impactsmart.signet_ingestion_zpb.ada_visual_predictions  ss
set ss.adjusted_forecast_qty = aa.adjusted_forecast_qty , ss.adjusted_discount_flag = aa.adjusted_discount_flag
,
 ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
from (
    select distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,updated_by, updated_at  , pm.product_bucket_code,aa.adjusted_forecast_qty,
    aa.adjusted_discount_flag
  from impactsmart.signet_ingestion_zpb.ada_visual_predictions_daily_retain aa 
  join impactsmart.signet_ingestion_zpb.product_master pm
  on aa.product_code =pm.product_code
  where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.product_bucket_code =aa.product_bucket_code
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;
        
        

       
drop table if exists `impactsmart.signet_ingestion_zpb.ada_visual_product_store_mapping`;
       

create table  `impactsmart.signet_ingestion_zpb.ada_visual_product_store_mapping`
PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
CLUSTER BY  fiscal_year_week, store_code , product_code
as 
select distinct product_code, store_code, fiscal_year_week from  `impactsmart.signet_ingestion_zpb.ada_visual_predictions` where fiscal_year_week !=1;        
      
       
drop table if exists impactsmart.signet_ingestion_zpb.ada_visual_actuals;

create table if not exists impactsmart.signet_ingestion_zpb.ada_visual_actuals
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
            as (select
              prd.product_code,
        (case when final_store_code is null then store_code else final_store_code end) as store_code,
        fiscal_year_week,
        fiscal_year_month,
        fiscal_year_quarter,
        fsc.fiscal_year,
        sum(qty) as qty,
        round(safe_divide(sum(qty*txn.price),sum(qty)),2) as price,
        round(safe_divide(sum(qty*txn.cost),sum(qty)),2) as cost,
        round(safe_divide(sum(qty*discount_amount),sum(qty)),2) as discount_amount,
        count(distinct transaction_code) as txn_count,
         prd.product_bucket_code
    from 
        `impactsmart.signet_ingestion_zpb.transaction_master` txn
    left join
        `impactsmart.signet_ingestion_zpb.fiscal_date_mapping` fsc
    using(date)
     join
        `impactsmart.signet_ingestion_zpb.product_master` prd
    using(product_code)
    left join
        `impactsmart.signet_ingestion_zpb.store_master` str
    using(store_code)
    left join  impactsmart.signet_ingestion_zpb.ecom_store_mapping_table e
      on str.store_code = e.old_store_code and prd. product_channel = e. product_channel
    group by
        (case when final_store_code is null then store_code else final_store_code end),
        fiscal_year_week,
        fiscal_year_month,
        fiscal_year_quarter,
        fiscal_year,
        prd.product_code,
        prd.product_bucket_code
        );
 