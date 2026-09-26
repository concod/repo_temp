--liquibase formatted sql
--changeset subhash.pophale@impactanalytics.co:get_bu runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:mtp-41228
--comment: Get business unit for the input channel array for PCHI
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.get_bu(p_channel text[]);
CREATE OR REPLACE FUNCTION plan_smart.get_bu(p_channel text[])
 RETURNS text[]
 LANGUAGE plpgsql
AS $function$
declare 
  v_bu    text[];
  channel text;
begin
  foreach channel in array p_channel
  loop
	if channel in  ('RP10', 'HUSA','1002')
	then
	  v_bu := v_bu||array['Retail'];
	elsif channel in ('ALBERTSONS COMPANIES INC.','CANADIAN_TIRE','CVS PHARMACY INC.','FRANCHISE','GIANT EAGLE INC.','INTERNAL','MEIJER INC.','OTHER','SPECIALITY','WAKEFERN FOOD CORP.','WALMART CANADA INC','WEGMANS FOOD MARKET INC.')
    then 
      v_bu := v_bu||array['Wholesale'];
    elsif channel = 'CHESTER_DC'
    then
      v_bu := v_bu||array['CHESTER_DC'];
    end if;
  end loop;
  return v_bu;
end
$function$
;
