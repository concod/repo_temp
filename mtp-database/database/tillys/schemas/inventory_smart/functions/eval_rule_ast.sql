--liquibase formatted sql
--changeset liquibase:eval_rule_ast runOnChange:true stripComments:false splitStatements:false context:MTP-125205 labels:MTP-125205
--comment: Create eval_rule_ast for Tillys
--rollback: SELECT 1

DROP FUNCTION if exists inventory_smart.eval_rule_ast(_text, bool, bool, bool, bool);
CREATE OR REPLACE FUNCTION inventory_smart.eval_rule_ast(tokens text[], cut_off_ok boolean, wos_thresh_ok boolean, min_dc_ok boolean, minstock_ok boolean)
RETURNS boolean
LANGUAGE plpgsql
AS $function$
DECLARE
 st boolean[] := ARRAY[]::boolean[];  -- evaluation stack
 i  integer;
 tok text;
 a   boolean;
 b   boolean;
 v   boolean;
 lo  integer;
 hi  integer;
BEGIN
 -- No AST provided → let caller fall back to legacy logic
 IF tokens IS NULL OR array_length(tokens,1) IS NULL THEN
   RETURN NULL;
 END IF;
 lo := COALESCE(array_lower(tokens,1), 1);
 hi := COALESCE(array_upper(tokens,1), 0);
raise notice 'lower, higher : % %',lo,hi;
 -- Evaluate prefix by scanning right-to-left
 FOR i IN REVERSE hi..lo LOOP
raise notice 'i: %', i;
   tok := tokens[i];
raise notice 'token indexed: %', tok;
   IF tok IN ('AND','OR','NOT') THEN
     IF tok = 'NOT' THEN
       IF COALESCE(array_length(st,1),0) < 1 THEN
         RAISE EXCEPTION 'Bad AST: NOT missing operand';
       END IF;
       a  := st[COALESCE(array_length(st,1),0)];
       st := st[1:COALESCE(array_length(st,1),0)-1];              -- pop
       st := COALESCE(st, ARRAY[]::boolean[]) || (NOT a);         -- push
     ELSIF tok = 'AND' THEN
       IF COALESCE(array_length(st,1),0) < 2 THEN
         RAISE EXCEPTION 'Bad AST: AND missing operands';
       END IF;
       a  := st[COALESCE(array_length(st,1),0)];                  -- op1
       st := st[1:COALESCE(array_length(st,1),0)-1];
       b  := st[COALESCE(array_length(st,1),0)];                  -- op2
       st := st[1:COALESCE(array_length(st,1),0)-1];
       st := COALESCE(st, ARRAY[]::boolean[]) || (a AND b);       -- push
     ELSE  -- OR
       IF COALESCE(array_length(st,1),0) < 2 THEN
         RAISE EXCEPTION 'Bad AST: OR missing operands';
       END IF;
       a  := st[COALESCE(array_length(st,1),0)];
       st := st[1:COALESCE(array_length(st,1),0)-1];
       b  := st[COALESCE(array_length(st,1),0)];
       st := st[1:COALESCE(array_length(st,1),0)-1];
       st := COALESCE(st, ARRAY[]::boolean[]) || (a OR b);        -- push
     END IF;
   ELSE
     -- Leaf mapping (use IF/ELSIF; RAISE allowed here)
     IF tok = 'Set CutOff WOS' THEN
       v := COALESCE(cut_off_ok, FALSE);
     ELSIF tok = 'Set WOS Threshold' THEN
       v := COALESCE(wos_thresh_ok, FALSE);
     ELSIF tok = 'Set Minimum DC Inventory' THEN
       v := COALESCE(min_dc_ok, FALSE);
     ELSIF tok = 'Triggered if MinStock not satisfied' THEN
       v := COALESCE(minstock_ok, FALSE);
     ELSIF tok = 'TRUE' THEN
       v := TRUE;
     ELSIF tok = 'FALSE' THEN
       v := FALSE;
     ELSE
       RAISE EXCEPTION 'Unknown token in rule_expression: %', tok;
     END IF;
     st := COALESCE(st, ARRAY[]::boolean[]) || v;                 -- push
   END IF;
 END LOOP;
 IF COALESCE(array_length(st,1),0) <> 1 THEN
   RAISE EXCEPTION 'Bad AST: stack ended with % items', COALESCE(array_length(st,1),0);
 END IF;
 RETURN st[1];
END
$function$
;
