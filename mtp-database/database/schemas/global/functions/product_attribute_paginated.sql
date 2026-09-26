--liquibase formatted sql
--changeset liquibase:product_attribute_paginated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attribute_paginated
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.product_attribute_paginated(input text, jsonb);
CREATE OR REPLACE FUNCTION global.product_attribute_paginated(input text, jsonb)
 RETURNS TABLE(attribute character varying)
 LANGUAGE plpgsql
AS $function$
	declare
		_sql text;
	begin
		_sql := 'SELECT * FROM (select
			attribute_value
		from
			"global".product_attributes
		where attribute_name = ''' || $1 || ''' group by 1) X ' || ("global".form_table_query($2));
		RETURN QUERY execute _sql;
	end
$function$
;
