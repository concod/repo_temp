--liquibase formatted sql
--changeset liquibase:pc_drop_mkd_temp_table_v2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_drop_mkd_temp_table

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_drop_mkd_temp_table(varchar, varchar);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_drop_mkd_temp_table(IN _schema character varying, IN _table_name character varying)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
	BEGIN
	EXECUTE FORMAT('DROP TABLE IF EXISTS %I.%I', _schema, _table_name);
	END;
	$procedure$
;