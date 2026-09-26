--liquibase formatted sql
--changeset liquibase:alerts_product_store_level stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:liquibase_project_start
--comment: initial changeset for alerts_product_store_level
CREATE TABLE inventory_smart.alerts_product_store_level (
	article text NULL,
	channel text NULL,
	store_code text NULL,
	style_description text NULL,
	product_type text NULL,
	launch_date date NULL,
	last_allocated text NULL,
	selldown_date date NULL,
	clearance_end_date date NULL,
	retirement_date date NULL,
	"style" text NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	lw_sales_units float8 NULL,
	lw_sales_revenue float8 NULL,
	lw_margin float8 NULL,
	discount float8 NULL,
	price float8 NULL,
	dc_on_hand float8 NULL,
	store_on_hand float8 NULL,
	store_on_order float8 NULL,
	intransit_to_store float8 NULL,
	fwos float8 NULL,
	instock_percentage float8 NULL,
	stockout int8 NULL,
	shortfall int8 NULL,
	normal int8 NULL,
	excess int8 NULL,
	case_pack_quantity float8 NULL,
	instock_percent float8 NULL,
	week_to_date_sales float8 NULL,
	yesterday_sales int8 NULL,
	sales_1_ago float8 NULL,
	sales_2_ago float8 NULL,
	sales_3_ago float8 NULL,
	sales_4_ago float8 NULL,
	bulk_remaining float8 NULL,
	available_to_allocate float8 NULL,
	dc_oh_1_wms_location float8 NULL,
	dc_oh_qcloc float8 NULL,
	dc_oh_cwc float8 NULL,
	dc_oh_10 float8 NULL,
	oo_dc float8 NULL,
	it_dc float8 NULL,
	clearance_start_date date NULL,
	clearance_alert int8 NULL,
	retirement_alert int8 NULL,
	selldown_alert int8 NULL,
	launch_alert int8 NULL,
	kits_alert int8 NULL,
	topn_alert int8 NULL,
	stockout_alert int8 NULL,
	shortfall_alert int8 NULL,
	excess_alert int8 NULL,
	pack_id text NULL,
	oh_pack_qty float8 NULL,
	si float8 NULL,
	promo float8 NULL,
	store_name text NULL,
	auto_alloc_alert int8 NULL,
	ca_is_resolved int8 NULL,
	ra_is_resolved int8 NULL,
	sla_is_resolved int8 NULL,
	la_is_resolved int8 NULL,
	kta_is_resolved int8 NULL,
	tna_is_resolved int8 NULL,
	sta_is_resolved int8 NULL,
	sfa_is_resolved int8 NULL,
	ea_is_resolved int8 NULL,
	color text NULL,
	pack_description text NULL
);


--changeset kailash.yadav@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:DAT-885 labels:style_color
--comment: style_color column add alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level ADD style_color varchar NULL;

--changeset suryasai.gopal@impactanalytics.co:alerts_product_store_level_alter_1 stripComments:false splitStatements:false context:MTP-18862 labels:selling_collection
--comment: selling_collection column add alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level ADD selling_collection varchar NULL;

--changeset suryasai.gopal@impactanalytics.co:alerts_product_store_level_alter_2 stripComments:false splitStatements:false context:MTP-18862 labels:fabrication
--comment: fabrication column add alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level ADD fabrication varchar NULL;

--changeset suryasai.gopal@impactanalytics.co:alerts_product_store_level_alter_3 stripComments:false splitStatements:false context:MTP-18862 labels:color
--comment: color column rename to color_code alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN color to color_code ;

--changeset suryasai.gopal@impactanalytics.co:alerts_product_store_level_alter_4 stripComments:false splitStatements:false context:MTP-18862 labels:style_color
--comment: style_color column rename to color alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level RENAME COLUMN style_color  to color ;

--changeset laraib.ahmad@impactanalytics.co:alerts_product_store_level_alter_5 stripComments:false splitStatements:false context:MTP-22181 labels:l3_name
--comment:  l3_name column add alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level ADD l3_name varchar null ;

--changeset shrinidhi.choragi@impactanalytics.co:alerts_product_store_level_alter_6 stripComments:false splitStatements:false context:MTP-25137 labels: number_of_allocations
--comment:  number_of_allocations column add alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level ADD number_of_allocations int8 ;

--changeset shrinidhi.choragi@impactanalytics.co:alerts_product_store_level_alter_7 stripComments:false splitStatements:false context:MTP-25137 labels: last_allocated
--comment:  last_allocated column datatype change alerts_product_store_level
ALTER TABLE inventory_smart.alerts_product_store_level ALTER COLUMN last_allocated TYPE date USING last_allocated::date;

--changeset laraib.ahmad@impactanalytics.co:alerts_product_store_level stripComments:false splitStatements:false context:MTP-35584 labels:Added Variance alerts column
--comment:  Added Variance alerts column
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists variance_alert  int8 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists store_count int8 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists min_deviation  float8 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists max_deviation float8 NULL;
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists variance float8 NULL;
--changeset laraib.ahmad@impactanalytics.co:alerts_product stripComments:false splitStatements:false context:MTP-35584 labels:Added agg_variance  column
--comment:  Added agg_variance  column
ALTER TABLE inventory_smart.alerts_product_store_level ADD if not exists agg_variance float8 NULL;