-- This is to refresh weekly prediction for Vera_bradley_dev
  
 /* Note: Few things to validate/confirm before executing the script
    1) Source and target dataset need to confirm if not impactsmart.vb_ingestion_dev then replace with new dataset.
    2) validate the last modified date of source table given,
       currently source table is (impactsmart.VB_Forecast.ada_sim_out_active)    
    3) validate the last modified date of other dependent tables like 
     impactsmart.vb_ingestion_dev.store_master 
     impactsmart.vb_ingestion_dev.product_master
     impactsmart.vb_ingestion_dev.fiscal_date_mapping
    
 
 
 */


---- Backup Start 

DROP SNAPSHOT TABLE if exists impactsmart.vb_ingestion_dev.ada_visual_predictions_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.vb_ingestion_dev.ada_visual_predictions_bkp
CLONE impactsmart.vb_ingestion_dev.ada_visual_predictions
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions",
  description="A table snapshot that expires in 2 days"
);


/*DROP SNAPSHOT TABLE if exists impactsmart.vb_ingestion_dev.ada_visual_predictions_hist_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.vb_ingestion_dev.ada_visual_predictions_hist_bkp
CLONE impactsmart.vb_ingestion_dev.ada_visual_predictions_hist
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);*/


DROP SNAPSHOT TABLE if exists impactsmart.vb_ingestion_dev.ada_visual_actuals_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.vb_ingestion_dev.ada_visual_actuals_bkp
CLONE impactsmart.vb_ingestion_dev.ada_visual_actuals
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);

---- Backup End 
--- Commented below ada_visual_predictions_hist because same moved to impactsmart.vb_ingestion_dev.impactsmart.puma_ingestion_dev.ada_visual_predictions_hist_update procedure
/*

insert into impactsmart.vb_ingestion_dev.ada_visual_predictions_hist
        (product_code,
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
            (select product_code, 
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
            (select fiscal_year_week-1 from impactsmart.vb_ingestion_dev.fiscal_date_mapping where date = current_date()) as snapshot_week 
    from `impactsmart.vb_ingestion_dev.ada_visual_predictions`  a
    where a.fiscal_year_week >= (select fiscal_year_week-1 from impactsmart.vb_ingestion_dev.fiscal_date_mapping where date = current_date()) 
    and a.fiscal_year_week <= (select MAX(fiscal_year_week)-1 from (select DISTINCT fiscal_year_week from impactsmart.vb_ingestion_dev.fiscal_date_mapping where date >= CURRENT_DATE() order by fiscal_year_week limit 8) x ) 
    and adjusted_discount_flag =true 
    and a.fiscal_year_week !=1
            );
        

*/

/*
drop table if exists impactsmart.vb_ingestion_dev.ada_visual_predictions_retain;

create table impactsmart.vb_ingestion_dev.ada_visual_predictions_retain
PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
  CLUSTER BY   fiscal_year_week,store_code , product_code,adjusted_discount_flag
  OPTIONS(
    require_partition_filter=true
  )
as  
select adjusted_forecast_qty,predicted_qty , promo_percentage, default_discount_flag,adjusted_discount_flag, fiscal_year_week , 
fiscal_date, product_code, store_code,
updated_by, updated_at  
  from impactsmart.vb_ingestion_dev.ada_visual_predictions where fiscal_year_week !=0 and 
 adjusted_discount_flag = true and (updated_by is not null or updated_at is not null);
 
 */


drop table if exists impactsmart.vb_ingestion_dev.ada_visual_predictions;



  
     create table if not exists impactsmart.vb_ingestion_dev.ada_visual_predictions
            (product_code		STRING	NOT NULL,
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
            )



  insert into `impactsmart.vb_ingestion_dev.ada_visual_predictions` 
  (product_code,
   store_code,
   fiscal_date,f
   iscal_year_week,
   predicted_qty,
   adjusted_forecast_qty,
  promo_percentage,
   default_discount_flag,
   adjusted_discount_flag,
   fiscal_year_month,
   fiscal_year_quarter,
   product_bucket_code
  )
     (SELECT b.product_code, 
        a.store_code,
         a.fiscal_date fiscal_date, 
        a.fiscal_year_week, 
       -- cast (null as string) merchandise_category,
        a.predicted_quantity predicted_qty,
        a.predicted_quantity adjusted_forecast_qty,
        a.percent_off promo_percentage,
        TRUE default_discount_flag,
        TRUE adjusted_discount_flag ,
        d.fiscal_year_month fiscal_year_month ,
        d.fiscal_year_quarter fiscal_year_quarter ,
        b.product_bucket_code
        -- null  updated_at
        FROM `impactsmart.VB_Forecast.ada_sim_out_active` a  
      join impactsmart.vb_ingestion_dev.product_master b
        on a.product_code=b.product_code
        join  impactsmart.vb_ingestion_dev.store_master c 
        on a.store_code = c.store_code
        join impactsmart.vb_ingestion_dev.fiscal_date_mapping d
        on d.fiscal_year_week =a.fiscal_year_week
        and a.fiscal_date = d.date
        ) ;

/*
--- Below script to update to retain updated value by tool.

update impactsmart.vb_ingestion_dev.ada_visual_predictions  ss
 set  ss.adjusted_discount_flag = false,
    ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
  from (
    select distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,updated_by, updated_at  
  from impactsmart.vb_ingestion_dev.ada_visual_predictions_retain aa where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;

 
update impactsmart.vb_ingestion_dev.ada_visual_predictions  ss
set ss.adjusted_forecast_qty = aa.adjusted_forecast_qty , ss.adjusted_discount_flag = aa.adjusted_discount_flag
,
 ss.updated_by= aa.updated_by,
   ss.updated_at =aa.updated_at 
from (
 select  distinct aa.fiscal_year_week , aa.fiscal_date, aa.product_code, aa.store_code ,aa.promo_percentage,aa.adjusted_forecast_qty,
 aa.adjusted_discount_flag,
 updated_by, updated_at  
  from impactsmart.vb_ingestion_dev.ada_visual_predictions_retain aa where adjusted_discount_flag = true) aa
  where ss.fiscal_year_week = aa.fiscal_year_week 
  and ss.fiscal_date = aa.fiscal_date
  and ss.promo_percentage =aa.promo_percentage
  and ss.product_code = aa.product_code 
  and ss.store_code = aa.store_code 
  and ss.fiscal_year_week!=1;
 */       
        

drop table if  exists `impactsmart.vb_ingestion_dev.ada_visual_product_store_mapping`;

   create table  `impactsmart.vb_ingestion_dev.ada_visual_product_store_mapping`
           PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
                CLUSTER BY  fiscal_year_week, store_code , product_code
                   as 
          select distinct product_code, store_code, fiscal_year_week from  `impactsmart.vb_ingestion_dev.ada_visual_predictions` where fiscal_year_week !=1;



--delete from impactsmart.signet_ingestion_zpb.ada_visual_actuals where fiscal_year_week!=1;

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
        prd.product_code        
        store_code,
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
        `impactsmart.vb_ingestion_dev.transaction_master` txn
    left join
        `impactsmart.vb_ingestion_dev.fiscal_date_mapping` fsc
    using(date)
    left join
        `impactsmart.vb_ingestion_dev.product_master` prd
    using(product_code)
    left join
        `impactsmart.vb_ingestion_dev.store_master` str
    using(store_code)
    group by
        store_code,
        fiscal_year_week,
        fiscal_year_month,
        fiscal_year_quarter,
        fiscal_year,
        product_code
        );  


