--liquibase formatted sql
--changeset ashish_gupta:rcl_product_mapping_product_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store
CREATE TABLE global.rcl_product_mapping_product_store (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	validity datemultirange NULL,
	psa_name varchar,
	child_sku varchar NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 null
) PARTITION BY LIST (rcl_code);
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES global.rcl_product_mapping_product_store_rule(rcl_code, rule_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_uk UNIQUE (rcl_code,rule_code,psa_code);

--changeset akshay.jain:rcl_product_mapping_product_store_v8 stripComments:false splitStatements:false context:Release_1_2 labels:changed_constraint
--comment: altered constraint
ALTER TABLE "global".rcl_product_mapping_product_store DROP CONSTRAINT rcl_product_mapping_product_store_fk;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES global.rcl_product_mapping_product_store_rule(rcl_code, rule_code) ON DELETE CASCADE;

--changeset kamuju.mahaveer@impactanalytics.co:rcl_product_mapping_product_store_v7 stripComments:false splitStatements:false context:Release_1_1 labels:VPP-321
--comment: Adding store_tier column
ALTER TABLE "global".rcl_product_mapping_product_store  ADD COLUMN IF NOT EXISTS store_tier varchar NULL;

--changeset srishti.kumari@impactanalytics.co:adding_index stripComments:false splitStatements:false context:MTP-92763 labels:MTP-92763
--comment: adding index
CREATE INDEX rcl_product_mapping_product_store_rule_code_idx ON global.rcl_product_mapping_product_store USING btree (rule_code, psa_name);


--changeset pradeep.nayak@impactanalytics.co:adding_iternary_id_column_for_starboard stripComments:false splitStatements:false context:MTP-92763 labels:MTP-92763
--comment: adding iternary_id column for starboard cruise ship itinerary-level mapping
ALTER TABLE "global".rcl_product_mapping_product_store ADD COLUMN IF NOT EXISTS itinerary_id integer DEFAULT NULL;
ALTER TABLE "global".rcl_product_mapping_product_store DROP CONSTRAINT IF EXISTS rcl_product_mapping_product_store_uk;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_uk UNIQUE (rcl_code, rule_code, psa_code, itinerary_id);



--changeset pradeep.nayak@impactanalytics.co:updating_iternary_type stripComments:false splitStatements:false context:MTP-92763 labels:MTP-92763
--comment: updating iternary_id column for starboard cruise ship itinerary-level mapping
-- Step 1: Drop the existing unique constraint that includes itinerary_id
ALTER TABLE global.rcl_product_mapping_product_store
    DROP CONSTRAINT IF EXISTS rcl_product_mapping_product_store_uk;
-- Step 2: Change the column type from integer to varchar
ALTER TABLE global.rcl_product_mapping_product_store
    ALTER COLUMN itinerary_id TYPE varchar USING itinerary_id::varchar;
-- Step 3: Re-create the unique constraint with the new type
ALTER TABLE global.rcl_product_mapping_product_store
    ADD CONSTRAINT rcl_product_mapping_product_store_uk
    UNIQUE (rcl_code, rule_code, psa_code, itinerary_id);