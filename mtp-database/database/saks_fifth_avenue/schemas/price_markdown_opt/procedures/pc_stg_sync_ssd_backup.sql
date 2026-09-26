--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_sync_ssd_backup runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_sync_ssd_backup

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_sync_ssd_backup;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_sync_ssd_backup(_backup_table_name text, _version text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_ssd_backup_query text;
BEGIN
    if _version = 'ia' then
    	_create_ssd_backup_query = format(' DROP TABLE IF EXISTS %1$s;
											CREATE TABLE %1$s(
											strategy_id int4 NOT NULL,
											product_id int4 NOT NULL,
											store_id int4 NOT NULL,
											product_level_id int8 NOT NULL,
											store_level_id int8 NOT NULL,
											recommendation_date date NOT NULL,
											recommended_offer_percentage float8 NOT NULL,
											effective_price_point float8 NOT NULL,
											pcd_id int4 NOT NULL,
											sales_units float8 NULL,
											margin float8 NULL,
											revenue float8 NULL,
											status int4 NULL,
											created_at timestamptz NULL,
											updated_at timestamptz NULL,
											created_by int4 NULL,
											updated_by int4 NULL,
											rem_inv float8 NULL,
											spend float8 NULL,
											sales_units_uncapped float8 NULL,
											previous_markdown_percentage float8 NULL,
											channel_info varchar NULL
										)
										PARTITION BY LIST (strategy_id);', _backup_table_name);
	else
		_create_ssd_backup_query = format(' DROP TABLE IF EXISTS %1$s;
											CREATE TABLE %1$s(
											strategy_id int4 NOT NULL,
											product_id int4 NOT NULL,
											store_id int4 NOT NULL,
											product_level_id int8 NOT NULL,
											store_level_id int8 NOT NULL,
											recommendation_date date NOT NULL,
											recommended_offer_percentage float8 NOT NULL,
											effective_price_point float8 NOT NULL,
											pcd_id int4 NOT NULL,
											sales_units float8 NULL,
											margin float8 NULL,
											revenue float8 NULL,
											status int4 NULL,
											created_at timestamptz NULL,
											updated_at timestamptz NULL,
											created_by int4 NULL,
											updated_by int4 NULL,
											rem_inv float8 NULL,
											spend float8 NULL,
											sales_units_uncapped float8 NULL,
											approval_status text NULL,
											previous_markdown_percentage float8 NULL,
											channel_info varchar NULL
										)
										PARTITION BY LIST (strategy_id);', _backup_table_name);
	end if;
   raise notice '_create_ssd_backup_query : %', _create_ssd_backup_query;
  execute _create_ssd_backup_query;
END;
$procedure$
;
