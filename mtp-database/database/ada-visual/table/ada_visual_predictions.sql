  
  
  create table if not exists impactsmart.signet_ingestion_zpb.ada_visual_predictions
        (product_code		STRING	,
      store_code		STRING,	
      fiscal_date		DATE	,
      fiscal_year_week		INTEGER	,
      merchandise_category		STRING,
      predicted_qty		FLOAT64,	
      adjusted_forecast_qty		FLOAT64,	
      promo_percentage		FLOAT64,	
      default_discount_flag		BOOLEAN	,
      adjusted_discount_flag		BOOLEAN,
      fiscal_year_quarter		INTEGER	,
      fiscal_year_month		INTEGER	,
      predicted_qty_round		FLOAT64,
      updated_by  STRING,
      updated_at datetime)
      PARTITION BY RANGE_BUCKET(fiscal_year_week, GENERATE_ARRAY(202101, 203052, 1))
        CLUSTER BY   fiscal_year_week,store_code , product_code,adjusted_discount_flag
        OPTIONS(
          require_partition_filter=true
        )
        ;