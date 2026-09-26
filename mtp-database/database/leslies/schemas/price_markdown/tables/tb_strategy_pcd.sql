--liquibase formatted sql
--changeset liquibase:tb_strategy_pcd_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_pcd - added serial 4
CREATE TABLE price_markdown.tb_strategy_pcd (
	pcd_id serial4 NOT NULL,
	strategy_id int4 NOT NULL,
	pcd_start_date date NOT NULL,
	pcd_end_date date NOT NULL,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	CONSTRAINT strategy_pcd_pkey PRIMARY KEY (pcd_id)
);
CREATE INDEX strategy_pcd_strategy_id_idx ON price_markdown.tb_strategy_pcd USING btree (strategy_id);