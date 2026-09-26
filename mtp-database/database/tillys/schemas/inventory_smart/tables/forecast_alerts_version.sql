--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:forecast_alerts_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for forecast_alerts_version

CREATE TABLE if not exists inventory_smart.forecast_alerts_version (
	version_code int4 NOT NULL,
	article text NOT NULL,
	product_code varchar NULL,
	channel text NULL,
	article_status_tag text NULL,
	launch_date date NULL,
	style_color_desc text NULL,
	l0_name varchar NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	"Price Status" varchar NULL,
	brand varchar NULL,
	vendor varchar NULL,
	color varchar NULL,
	oh float4 NULL,
	oo float4 NULL,
	it float4 NULL,
	oh_dc float4 NULL,
	dc float4 NULL,
	lw_revenue numeric NULL,
	lw_margin float4 NULL,
	sales_1_ago int4 NULL,
	sales_2_ago int4 NULL,
	sales_3_ago int4 NULL,
	sales_4_ago int4 NULL,
	promo_percentage numeric NULL,
	new_total_actual int4 NULL,
	new_total_forecast float4 NULL,
	new_product_accuracy_pct float4 NULL,
	new_forecast_accuracy_flag int4 NULL,
	is_resolved_new_product int4 DEFAULT 0 NULL,
	past_4weeks_actual int4 NULL,
	next_4weeks_forecast float4 NULL,
	recent_deviation_accuracy_pct float4 NULL,
	recent_deviation_flag int4 NULL,
	is_resolved_recent_deviation int4 DEFAULT 0 NULL,
	allocation_product_alert_flag int4 NULL,
	is_resolved_allocation_product_alert int4 DEFAULT 0 NULL,
	allocation_total_actual int4 NULL,
	allocation_total_forecast float4 NULL,
	allocation_product_accuracy_pct float4 NULL,
	CONSTRAINT forecast_alerts_version_pk PRIMARY KEY (article, version_code),
	CONSTRAINT forecast_alerts_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset gauri.nair@impactanalytics.co:forecast_alerts_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_v2
--comment: initial changeset for forecast_alerts_version_v2
alter table inventory_smart.forecast_alerts_version rename column "Price Status" to price_status;

--changeset gauri.nair@impactanalytics.co:forecast_alerts_version_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_v4
--comment: initial changeset for forecast_alerts_version_v4

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'inventory_smart'
          AND table_name   = 'forecast_alerts_version'
          AND column_name  = 'new_forecast_accuracy_flag'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'inventory_smart'
          AND table_name   = 'forecast_alerts_version'
          AND column_name  = 'new_product_accuracy_flag'
    )
    THEN
        ALTER TABLE inventory_smart.forecast_alerts_version
        RENAME COLUMN new_forecast_accuracy_flag TO new_product_accuracy_flag;
    END IF;
END $$;