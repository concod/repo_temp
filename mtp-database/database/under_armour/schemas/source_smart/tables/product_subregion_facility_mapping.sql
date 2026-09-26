--liquibase formatted sql
--changeset liquibase:product_subregion_facility_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_subregion_facility_mapping
CREATE TABLE source_smart.product_subregion_facility_mapping (
	product_code varchar(255) NOT NULL,
	subregion varchar(255) NOT NULL,
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
	facility_id _int4 NULL,
	lock_type varchar(255) NULL,
	CONSTRAINT product_subregion_facility_mapping_unique UNIQUE (product_code, subregion, allocation_id, operation_id)
);

--changeset mayank.mukundam@impactanalytics.co:product_subregion_facility_mapping_index stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: create index on product_subregion_facility_mapping
CREATE INDEX product_subregion_facility_mapping_allocation_id_idx ON source_smart.product_subregion_facility_mapping USING btree (allocation_id, operation_id);

--changeset genuine.basil@impactanalytics.co:product_subregion_facility_mapping_idx_alloc_op_product_subregion stripComments:false splitStatements:false context:Release_1_2 labels:liquibase_project_start
--comment: index on allocation_id, operation_id, product_code, subregion for lookup patterns
CREATE INDEX IF NOT EXISTS idx_psfm_alloc_op_product_subregion ON source_smart.product_subregion_facility_mapping (allocation_id, operation_id, product_code, subregion);