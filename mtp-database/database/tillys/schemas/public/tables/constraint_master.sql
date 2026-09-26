--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:constraint_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for constraint_master
CREATE TABLE public.constraint_master (
	mapping_code int4 NULL,
	l0_name varchar NULL,
	channel varchar NULL,
	product_code varchar NULL,
	store_code varchar NULL,
	wos float4 NULL,
	transit_time float4 NULL,
	safety_stock float4 NULL,
	min_stock float4 DEFAULT 0 NULL,
	max_stock float4 DEFAULT 0 NULL,
	aps float4 NULL,
	ros float4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	created_by int4 NULL,
	upload_flag varchar DEFAULT false NOT NULL,
	rcl_code varchar NULL,
	rcl_dimension varchar NULL,
	rule_name varchar NULL,
	psa_name varchar NULL,
	psa_code varchar NULL,
	start_date varchar NULL,
	end_date varchar NULL,
	min varchar NULL,
	max varchar NULL,
	CONSTRAINT constraint_master_un_fk UNIQUE (mapping_code, l0_name),
	CONSTRAINT constraint_master_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT constraint_master_fk FOREIGN KEY (mapping_code,l0_name) REFERENCES "global".product_mapping_product_store(mapping_code,l0_name) ON DELETE SET NULL,
	CONSTRAINT constraint_master_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE,
	CONSTRAINT constraint_master_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE,
	CONSTRAINT constraint_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
)
PARTITION BY LIST (l0_name);
CREATE INDEX constraint_master_l0 ON public.constraint_master USING btree (l0_name);
CREATE INDEX constraint_master_product_code_idx ON public.constraint_master USING btree (product_code, store_code);