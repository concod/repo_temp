

--liquibase formatted sql
--changeset liquibase:product_all_subregion_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_all_subregion_mapping
CREATE TABLE source_smart.product_all_subregion_mapping (
	product_code varchar(255) NOT NULL,
	subregion _text NOT NULL,
	strategy_name varchar(255) NULL,
	factors jsonb NULL,
	demand int4 NULL,
	sourcing_type varchar(255) NULL,
	threshold int4 NULL,
	forecast_deviation numeric NULL,
	previous_allocated_units int4 NULL,
	previous_allocated_factory_count int4 NULL,
	primary_factory varchar(255) NULL,
	secondary_factory varchar(255) NULL,
	allocation_id uuid NULL,
	operation_id uuid NULL,
	rule_id int4 NULL,
	is_updated bool NULL,
	facility_id int4 NULL,
	lock_type varchar(255) NULL,
	CONSTRAINT product_all_subregion_mapping_unique UNIQUE (product_code, subregion, allocation_id, operation_id, facility_id)
);
--changeset liquibase:product_all_subregion_mapping_drop_facility_id_from_unique stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: Remove facility_id from product_all_subregion_mapping unique constraint
ALTER TABLE source_smart.product_all_subregion_mapping DROP CONSTRAINT IF EXISTS product_all_subregion_mapping_unique;
ALTER TABLE source_smart.product_all_subregion_mapping ADD CONSTRAINT product_all_subregion_mapping_unique UNIQUE (product_code, subregion, allocation_id, operation_id);