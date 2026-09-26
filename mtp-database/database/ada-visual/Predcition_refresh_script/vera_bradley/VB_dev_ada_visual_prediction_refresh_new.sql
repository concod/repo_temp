  -- This is to refresh weekly prediction for Vera_bradley_test
  
 /* Note: Few things to validate/confirm before executing the script
    1) Source and target dataset need to confirm if not impactsmart.vb_ingestion_dev then replace with new dataset.
    2) validate the last modified date of source table given,
       currently source tables are (impactsmart.VB_Forecast.bass_ada_serve_predictions_fact_line_60223_final, impactsmart.VB_Forecast.bass_ada_serve_predictions_full_line_60223_final)    
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





DROP SNAPSHOT TABLE if exists impactsmart.vb_ingestion_dev.ada_visual_actuals_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.vb_ingestion_dev.ada_visual_actuals_bkp
CLONE impactsmart.vb_ingestion_dev.ada_visual_actuals
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);

---- Backup End 

/*

DROP SNAPSHOT TABLE if exists impactsmart.vb_ingestion_dev.ada_visual_predictions_hist_bkp;


CREATE SNAPSHOT TABLE  IF NOT EXISTS  impactsmart.vb_ingestion_dev.ada_visual_predictions_hist_bkp
CLONE impactsmart.vb_ingestion_dev.ada_visual_predictions_hist
OPTIONS(
  expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 48 HOUR),
  friendly_name="ada_visual_predictions_hist",
  description="A table snapshot that expires in 2 days"
);
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
          created_at datetime DEFAULT CURRENT_DATETIME() ,
          created_by STRING   DEFAULT SESSION_USER() ,
          is_deleted boolean default FALSE  NOT NULL  
            )
          PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
            CLUSTER BY   adjusted_discount_flag, default_discount_flag,  product_bucket_code,promo_percentage 
            OPTIONS(
              require_partition_filter=true
            )AS 
      (SELECT b.product_code, 
        a.store_code,
        a.fiscal_date fiscal_date, 
        a.fiscal_year_week, 
        a.predicted_quantity predicted_qty,
        a.predicted_quantity adjusted_forecast_qty,
        case when (a.promo_percentage*100)<100 then cast(round(a.promo_percentage*100,2) as  NUMERIC) else cast(a.promo_percentage as  NUMERIC) end as  promo_percentage,
        TRUE default_discount_flag,
        TRUE adjusted_discount_flag ,
         d.fiscal_year_quarter fiscal_year_quarter,
        d.fiscal_year_month fiscal_year_month ,
          a.predicted_quantity predicted_qty,
         null updated_by,
         null updated_at,
        b.product_bucket_code,
        CURRENT_DATETIME() created_at ,
         SESSION_USER() created_by,
        FALSE is_deleted
        FROM `impactsmart.VB_Forecast.ada_sim_out_active` a 
        join impactsmart.vb_ingestion_dev.product_master b
        on a.product_code=b.product_code
        join  impactsmart.vb_ingestion_dev.store_master c 
        on a.store_code = c.store_code
        join impactsmart.vb_ingestion_dev.fiscal_date_mapping d
        on d.fiscal_year_week =a.fiscal_year_week
        and a.fiscal_date = d.date
        ) ; 
   
    

  
    drop table if  exists `impactsmart.vb_ingestion_dev.ada_visual_product_store_mapping`;

   create table  `impactsmart.vb_ingestion_dev.ada_visual_product_store_mapping`
           PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
                CLUSTER BY  fiscal_year_week, store_code , product_code
                   as 
          select distinct product_code, store_code, fiscal_year_week 
          from  `impactsmart.vb_ingestion_dev.ada_visual_predictions` where fiscal_year_week !=1;


drop table if exists impactsmart.vb_ingestion_dev.ada_visual_actuals;

create table if not exists impactsmart.vb_ingestion_dev.ada_visual_actuals
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
        prd.product_code,
        prd.product_bucket_code    
        );
        
        
        =============================
        
        
create table if not exists impactsmart.vb_ingestion_dev.ada_visual_fiscal_date_mapping_graph
as 
select * from (
with fiscal_month_previousyearsmap as
(SELECT *
 FROM
  (
  SELECT fiscal_month_in_year , fiscal_year_month, fiscal_year,
          lag(fiscal_year_month,1) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_1yb,
          lag(fiscal_year_month,2) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_2yb,
          lag(fiscal_year_month,3) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_3yb,
          lag(fiscal_year_month,4) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_4yb,
          lag(fiscal_year_month,5) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_5yb,
          lag(fiscal_year_month,6) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_6yb,
          lag(fiscal_year_month,7) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_7yb,
          lag(fiscal_year_month,8) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_8yb,
          lag(fiscal_year_month,9) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_9yb,
          lag(fiscal_year_month,10) OVER (PARTITION BY fiscal_month_in_year ORDER BY fiscal_year_month ASC) AS fym_10yb,
  FROM `impactsmart.vb_ingestion_dev.fiscal_date_mapping`
  GROUP BY fiscal_month_in_year, fiscal_year_month, fiscal_year
  )
WHERE fiscal_year >= 2022
),
fiscal_quarter_previousyearsmap as
(SELECT *
 FROM
  (
  SELECT fiscal_quarter_in_year , fiscal_year_quarter, fiscal_year,
          lag(fiscal_year_quarter,1) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_1yb,
          lag(fiscal_year_quarter,2) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_2yb,
          lag(fiscal_year_quarter,3) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_3yb,
          lag(fiscal_year_quarter,4) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_4yb,
          lag(fiscal_year_quarter,5) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_5yb,
          lag(fiscal_year_quarter,6) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_6yb,
          lag(fiscal_year_quarter,7) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_7yb,
          lag(fiscal_year_quarter,8) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_8yb,
          lag(fiscal_year_quarter,9) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_9yb,
          lag(fiscal_year_quarter,10) OVER (PARTITION BY fiscal_quarter_in_year ORDER BY fiscal_year_quarter ASC) AS fyq_10yb,
  FROM `impactsmart.vb_ingestion_dev.fiscal_date_mapping`
  GROUP BY fiscal_quarter_in_year, fiscal_year_quarter, fiscal_year
  )
WHERE fiscal_year >= 2022
),
fiscal_week_previousyearsmap as
(select *
from
  (
  SELECT fiscal_week_in_year , fiscal_year_week, fiscal_year, fiscal_year_month, fiscal_year_quarter,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_1yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,2)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_2yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,3)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_3yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,4)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_4yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,5)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_5yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,6)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_6yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,7)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_7yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,8)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_8yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,9)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_9yb,
          (case when (fiscal_week_in_year) = 53 then null else lag(fiscal_year_week,10)
            OVER (PARTITION BY fiscal_week_in_year ORDER BY fiscal_year_week ASC) end) AS fyw_10yb,
  FROM `impactsmart.vb_ingestion_dev.fiscal_date_mapping`
  GROUP BY fiscal_week_in_year , fiscal_year_week, fiscal_year, fiscal_year_month, fiscal_year_quarter
  )
WHERE fiscal_year >= 2022
),
final_query as (
select week.*,month.fym_1yb,
month.fym_2yb,
month.fym_3yb,
month.fym_4yb,
month.fym_5yb,
month.fym_6yb,
month.fym_7yb,
month.fym_8yb,
month.fym_9yb,
month.fym_10yb, 
quarter.fyq_1yb,
quarter.fyq_2yb,
quarter.fyq_3yb,
quarter.fyq_4yb,
quarter.fyq_5yb,
quarter.fyq_6yb,
quarter.fyq_7yb,
quarter.fyq_8yb,
quarter.fyq_9yb,
quarter.fyq_10yb
from fiscal_week_previousyearsmap as week
left join fiscal_month_previousyearsmap as month
on week.fiscal_year_month = month.fiscal_year_month
left join fiscal_quarter_previousyearsmap as quarter
on week.fiscal_year_quarter = quarter.fiscal_year_quarter)
select * from final_query
); 
