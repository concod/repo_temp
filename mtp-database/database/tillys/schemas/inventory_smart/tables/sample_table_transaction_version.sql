--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:sample_table_transaction_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for sample_table_transaction_version

CREATE TABLE inventory_smart.sample_table_transaction_version (
	version_code int4 NOT NULL,
	product_code varchar NOT NULL,
	article varchar NOT NULL,
	"date" date NULL,
	quantity_sold int4 NULL,
	current_msrp numeric NULL,
	unit_net_selling_price numeric NULL,
	revenue numeric NULL,
	total_discount_amount numeric NULL,
	unit_cost numeric NULL,
	unit_retail_price numeric NULL,
	clearance_indicator_value numeric NULL,
	weighted_average_unit_price numeric NULL,
	discount_percentage numeric NULL,
	store_code varchar NULL,
	CONSTRAINT sample_table_transaction_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);

--changeset gauri.nair@impactanalytics.co:sample_table_transaction_version_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts_2
--comment: initial changeset for sample_table_transaction_version_2
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN quantity_sold TO qty;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN current_msrp TO price;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN unit_net_selling_price TO unit_nsp;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN revenue TO updated_total_extended_line_amount;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN total_discount_amount TO updated_total_discount_amount;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN unit_cost TO updated_unit_cost;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN unit_retail_price TO updated_unit_price;
ALTER TABLE inventory_smart.sample_table_transaction_version RENAME COLUMN weighted_average_unit_price TO weighted_avg_unit_price;

