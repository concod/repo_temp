--liquibase formatted sql
--changeset linu.nazil:create_alloc_rules_exceptions runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for create_alloc_rules_exceptions
--rollback: SELECT 1
drop function if exists inventory_smart.create_auto_allocation_rules_exceptions(_master_input jsonb);
create or replace function inventory_smart.create_auto_allocation_rules_exceptions(_master_input jsonb)
returns void
language plpgsql
as $function$
declare 
_sql text;
_item jsonb;
/*select * from inventory_smart.create_auto_allocation_rules_exceptions('[{"rule_code": 676190659, "validity": null, "store_code": "1006200000", "is_active": true, "updated_by": 155, "created_by": 155}, {"rule_code": 676190659, "validity": null, "store_code": "10003514", "is_active": true, "updated_by": 155, "created_by": 155}, {"rule_code": 676190659, "validity": null, "store_code": "10003484", "is_active": true, "updated_by": 155, "created_by": 155}]')*/
begin 
	if jsonb_array_length(_master_input) > 0 then
		for _item in select * from jsonb_array_elements(_master_input) loop
			raise notice 'rule_code: %', _item->>'rule_code';
			_sql := 'INSERT INTO inventory_smart.alloc_rule_store_exceptions(rule_code,validity,store_code,is_active,created_at,created_by) values(
							('|| case when _item->>'rule_code' is null then 'NULL' else quote_literal(_item->>'rule_code') end || ')::int4,
							('|| case when _item->>'validity' is null then 'NULL' else quote_literal(_item->>'validity') end || ')::daterange,
							('|| case when _item->>'store_code' is null then 'NULL' else quote_literal(_item->>'store_code') end || ')::varchar,
							('|| case when _item->>'is_active' is null then 'NULL' else quote_literal(_item->>'is_active') end || ')::bool,
							('|| quote_literal(now()) || ')::date,
							('|| case when _item->>'created_by' is null then 'NULL' else quote_literal(_item->>'created_by') end || ')::int4);';
			raise notice 'master sql: %', _sql;
			execute _sql;
		end loop;
	end if;
end
$function$;