--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:generate_grouping_sets_chg2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-30964
--comment: aaded one extra parameter for group by
--rollback: SELECT 1
DROP FUNCTION IF EXISTS plan_smart.generate_grouping_sets(input_json jsonb);
CREATE OR REPLACE FUNCTION plan_smart.generate_grouping_sets(input_array text[], p_grouping_set boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    sets text[];
    i int;
    result text := 'GROUP BY grouping sets (';
begin
  if p_grouping_set
  then
    FOR i IN array_lower(input_array, 1)..array_upper(input_array, 1) LOOP
        sets := array_agg(input_array[j]::text ORDER BY j) FROM generate_series(1, i) j;
        result := result || '(' || array_to_string(sets, ',') || ')';
        IF i < array_upper(input_array, 1) THEN
            result := result || ',';
        END IF;
    END LOOP;
    result := result || ')';
    RETURN result;
 else
   return 'group by '||array_to_string(input_array,',');
 end if;
END;
$function$
;
