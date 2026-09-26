create table `impactsmart.signet_ingestion.ada_visual_actuals`  
(product_code		STRING	,
store_code		STRING,	
fiscal_year_week	INTEGER	,
qty                     float64, 
price                   float64, 
cost float64, 
discount_amount float64, 
txn_count integer,
fiscal_year_quarter		INTEGER	,
fiscal_year_month		INTEGER	,
 fiscal_year    INTEGER
)
  PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
  CLUSTER BY   fiscal_year_week,store_code, product_code 
  OPTIONS(
    require_partition_filter=true
  );