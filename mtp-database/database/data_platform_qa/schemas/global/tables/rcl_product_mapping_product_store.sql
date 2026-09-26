--liquibase formatted sql
--changeset ashish_gupta:rcl_product_mapping_product_store stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store
CREATE TABLE global.rcl_product_mapping_product_store (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	psa_code varchar NOT NULL,
	validity datemultirange NOT NULL,
	psa_name int,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 null
) PARTITION BY LIST (rcl_code);
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES global.rcl_product_mapping_product_store_rule(rcl_code, rule_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;

--changeset akshay.jain:rcl_product_mapping_product_store_v3 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: removed not null constraint from validity column
ALTER TABLE "global".rcl_product_mapping_product_store  ALTER COLUMN validity DROP NOT NULL;

--changeset linu.nazil:rcl_product_mapping_product_store_v4 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: Adding child sku colm
ALTER TABLE "global".rcl_product_mapping_product_store  ADD COLUMN IF NOT EXISTS child_sku varchar NULL;

--changeset ashish@impactanalytics.co:rcl_product_mapping_product_store_v5 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: Adding UK Constraint
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_uk UNIQUE (rcl_code,rule_code,psa_code);

--changeset linu.nazil:rcl_product_mapping_product_store_v6 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: datatype change
alter table global.rcl_product_mapping_product_store alter column psa_name type varchar;

--changeset kamuju.mahaveer@impactanalytics.co:rcl_product_mapping_product_store_v7 stripComments:false splitStatements:false context:Release_1_1 labels:VPP-321
--comment: Adding store_tier column
ALTER TABLE "global".rcl_product_mapping_product_store  ADD COLUMN IF NOT EXISTS store_tier varchar NULL;

--changeset akshay.jain:rcl_product_mapping_product_store_v8 stripComments:false splitStatements:false context:Release_1_2 labels:changed_constraint
--comment: altered constraint
ALTER TABLE "global".rcl_product_mapping_product_store DROP CONSTRAINT rcl_product_mapping_product_store_fk;
ALTER TABLE "global".rcl_product_mapping_product_store ADD CONSTRAINT rcl_product_mapping_product_store_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES global.rcl_product_mapping_product_store_rule(rcl_code, rule_code) ON DELETE CASCADE;
