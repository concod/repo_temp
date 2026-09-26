--liquibase formatted sql
--changeset shinde.samarth@impactanalytics.co:eval_rule_ast_safe runOnChange:true stripComments:false splitStatements:false context:MTP-118004 labels:MTP-118004
--comment: MTP-118004 eval_rule_ast_safe function
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.eval_rule_ast_safe(text[], boolean, boolean, boolean, boolean) CASCADE;

CREATE OR REPLACE FUNCTION inventory_smart.eval_rule_ast_safe(
  tokens text[],
  cut_off_ok boolean,
  wos_thresh_ok boolean,
  min_dc_ok boolean,
  minstock_ok boolean
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  -- Delegate to the strict evaluator implemented by Samridhi.
  -- If it raises for malformed AST or unknown tokens, catch and return NULL.
  RETURN inventory_smart.eval_rule_ast(tokens, cut_off_ok, wos_thresh_ok, min_dc_ok, minstock_ok);
EXCEPTION WHEN OTHERS THEN
  -- Log a short notice for debugging/triage. Can be changed to an INSERT into an audit table if desired.
  RAISE NOTICE 'inventory_smart.eval_rule_ast failed: %', SQLERRM;
  RETURN NULL;
END;
$$;