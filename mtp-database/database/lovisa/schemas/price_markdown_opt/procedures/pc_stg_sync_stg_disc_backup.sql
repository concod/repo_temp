--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_stg_sync_stg_disc_backup_05032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_sync_stg_disc_backup

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_sync_stg_disc_backup;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_sync_stg_disc_backup(_backup_table_name text, _version text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_stg_disc_backup_query text;
BEGIN
    if _version = 'ia' then
    	_create_stg_disc_backup_query = format('DROP TABLE IF EXISTS %1$s;
												CREATE TABLE %1$s (
												strategy_id int4 NOT NULL,
												product_level_value text NULL,
												store_level_value text NULL,
												pcd_id int4 NOT NULL,
												markdown_percentage float8 NULL,
												is_locked int2 NULL DEFAULT 0,
												created_at timestamptz NOT NULL DEFAULT now(),
												updated_at timestamptz NULL DEFAULT now(),
												created_by int4 NOT NULL DEFAULT 0,
												updated_by int4 NULL DEFAULT 0,
												product_level_id int8 NOT NULL DEFAULT 0,
												store_level_id int8 NOT NULL DEFAULT 0,
												id serial4 NOT NULL,
												incremental_discount float8 NULL,
												previous_markdown_percentage int8 NULL,
												previous_pcd_id int4 NULL,
												average_retail_price float8 NULL,
												channel_info varchar NULL,
												markdown_type text NULL,
												currency_id int4 NULL,
												average_retail_price_with_vat float8 NULL,
												effective_price_point int8 NULL
											)
											PARTITION BY LIST (strategy_id);', _backup_table_name);
	else
		_create_stg_disc_backup_query = format('DROP TABLE IF EXISTS %1$s;
												CREATE TABLE %1$s (
												strategy_id int4 NOT NULL,
												product_level_value text NULL,
												store_level_value text NULL,
												pcd_id int4 NOT NULL,
												markdown_percentage float8 NULL,
												is_locked int2 NULL DEFAULT 0,
												created_at timestamptz NOT NULL DEFAULT now(),
												updated_at timestamptz NULL DEFAULT now(),
												created_by int4 NOT NULL DEFAULT 0,
												updated_by int4 NULL DEFAULT 0,
												product_level_id int8 NOT NULL DEFAULT 0,
												store_level_id int8 NOT NULL DEFAULT 0,
												id serial4 NOT NULL,
												previous_markdown_percentage float8 NULL,
												incremental_discount float8 NULL,
												approval_status text NULL DEFAULT ''Not Approved'',
												previous_pcd_id int4 NULL,
												channel_info varchar NULL,
												average_retail_price float8 NULL,
												markdown_type text NULL,
												action_status text NULL DEFAULT ''No Action'',
												currency_id int4 NULL,
												average_retail_price_with_vat float8 NULL,
												effective_price_point int8 NULL												
											)
											PARTITION BY LIST (strategy_id);', _backup_table_name);
	end if;
	raise notice '_create_ssd_backup_query : %', _create_stg_disc_backup_query;
	execute _create_stg_disc_backup_query;
END;
$procedure$
;