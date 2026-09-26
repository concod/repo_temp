--liquibase formatted sql
--changeset liquibase:pc_drop_artifacts_opt runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pc_drop_artifacts_opt

DROP PROCEDURE IF EXISTS price_markdown.pc_drop_artifacts_opt;

CREATE OR REPLACE PROCEDURE price_markdown.pc_drop_artifacts_opt(IN _type text, IN _name text)
 LANGUAGE plpgsql
  SECURITY DEFINER
AS $procedure$
declare
 _statement text;
begin
	_statement = 'DROP ' || _type || ' IF EXISTS ' || _name;
    EXECUTE _statement;
END;
$procedure$
;
