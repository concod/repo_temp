--liquibase formatted sql
--changeset ashish_gupta:rcl_product_mapping_product_store_exceptions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store_exceptions
CREATE TABLE global.rcl_product_mapping_product_store_exceptions (
	rcl_code int4 NOT NULL,
	rule_code int4 NOT NULL,
	validity datemultirange NOT NULL,
	store_code varchar NOT NULL,
	psa_name int, 
	sa_code varchar,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL
) PARTITION BY LIST (rcl_code);
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions ADD CONSTRAINT rcl_product_mapping_product_store_exceptions_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES global.rcl_product_mapping_product_store_rule(rcl_code, rule_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions ADD CONSTRAINT rcl_product_mapping_product_store_exceptions_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions ADD CONSTRAINT rcl_product_mapping_product_store_exceptions_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE RESTRICT;
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions ADD CONSTRAINT rcl_product_mapping_product_store_exceptions_store_master_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
CREATE INDEX rcl_product_mapping_product_store_exceptions_store_code_idx ON "global".rcl_product_mapping_product_store_exceptions (store_code);

--changeset ashish_gupta:rcl_product_mapping_product_store_exceptions_sa_code stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store_exceptions_sa_code
ALTER TABLE global.rcl_product_mapping_product_store_exceptions RENAME COLUMN "sa_code" TO psa_code;

--changeset akshay.jain:rcl_product_mapping_product_store_v2 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: removed not null constraint from validity column
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions  ALTER COLUMN validity DROP NOT NULL;

--changeset ashish@impactanalytics.co:rcl_product_mapping_product_store_exceptions_v5 stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: Adding UK Constraint
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions ADD CONSTRAINT rcl_product_mapping_product_store_exceptions_uk UNIQUE (rcl_code,rule_code,store_code);

--changeset linu.nazil:rcl_product_mapping_product_store_v6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for rcl_product_mapping_product_store_v6
alter table global.rcl_product_mapping_product_store_exceptions alter column psa_name type varchar;


--changeset akshay.jain:rcl_product_mapping_product_store_exception_v8 stripComments:false splitStatements:false context:Release_1_3 labels:changed_constraint
--comment: altered constraint
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions DROP CONSTRAINT rcl_product_mapping_product_store_exceptions_fk;
ALTER TABLE "global".rcl_product_mapping_product_store_exceptions ADD CONSTRAINT rcl_product_mapping_product_store_exceptions_fk FOREIGN KEY (rcl_code, rule_code) REFERENCES global.rcl_product_mapping_product_store_rule(rcl_code, rule_code) ON DELETE CASCADE;
