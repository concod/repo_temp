--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co:pc_stg_sync_stg_disc_backup_10042026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_sync_stg_disc_backup

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_sync_stg_disc_backup;

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_sync_stg_disc_backup(_backup_table_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_create_stg_disc_backup_query text;
BEGIN
    _create_stg_disc_backup_query = format('DROP TABLE IF EXISTS %1$s;
                                            CREATE TABLE %1$s (
                                            id int4 NOT NULL,
                                            strategy_id int4 NOT NULL,
                                            product_level_id int8 NOT NULL DEFAULT 0,
                                            store_level_id int8 NOT NULL DEFAULT 0,
                                            pcd_data jsonb NULL,
                                            created_at timestamptz NOT NULL DEFAULT now(),
                                            updated_at timestamptz NULL DEFAULT now(),
                                            created_by int4 NOT NULL DEFAULT 0,
                                            updated_by int4 NULL DEFAULT 0,
                                            ia_pcd_data jsonb NULL,
                                            currency_id int4 NULL,
                                            channel_info varchar NULL
                                        )
                                        PARTITION BY LIST (strategy_id);', _backup_table_name);
	raise notice '_create_ssd_backup_query : %', _create_stg_disc_backup_query;
	execute _create_stg_disc_backup_query;
END;
$procedure$
;