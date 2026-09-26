--liquibase formatted sql
--changeset liquibase:tb_strategy_pcd_new_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_pcd_new - added serial 4 with order_number and unique constraint
CREATE TABLE price_markdown.tb_strategy_pcd_new (
	pcd_id serial4 NOT NULL,
	strategy_id int4 NOT NULL,
	pcd_start_date date NOT NULL,
	pcd_end_date date NOT NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 DEFAULT 0 NULL,
	updated_by int4 DEFAULT 0 NULL,
	order_number int4 NOT NULL,
	CONSTRAINT strategy_pcd_new_pkey PRIMARY KEY (pcd_id),
	CONSTRAINT uq_strategy_pcd__new_order UNIQUE (strategy_id, order_number)
);
CREATE INDEX strategy_pcd_strategy_id__new_idx ON price_markdown.tb_strategy_pcd_new USING btree (strategy_id);
