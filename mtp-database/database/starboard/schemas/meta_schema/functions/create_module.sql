--liquibase formatted sql
--changeset abhishek.kohli@impactanalytics.co:create_module runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42227
--comment: initial changeset for create_module
--rollback: SELECT 1
DROP FUNCTION IF EXISTS meta_schema.create_module(_text, _text, _text);
CREATE OR REPLACE FUNCTION meta_schema.create_module(modules text[], channels text[], versions text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$
	declare 
	parent_1_id INT := -1;
	parent_2_id INT := -1;
	parent_3_id INT := -1;
	module_master_attribute INT := 1;
    channel_master_attribute INT := 2;
    version_master_attribute INT := 3;
   	module TEXT;
   	channel TEXT;
    version TEXT;
	
	BEGIN
	foreach module in array modules
	loop 
		insert into meta_schema.tb_sub_master_attributes(name,label,master_attribute_id,parent_id,is_active)	
		values (module,module,module_master_attribute,parent_1_id,true)
		returning id into parent_2_id;
		foreach channel in array channels
		loop
			insert into meta_schema.tb_sub_master_attributes(name,label,master_attribute_id,parent_id,is_active)	
			values (channel,channel,channel_master_attribute,parent_2_id,true)
			returning id into parent_3_id;
			foreach version in array versions
			loop
				insert into meta_schema.tb_sub_master_attributes(name,label,master_attribute_id,parent_id,is_active)	
				values (version,version,version_master_attribute,parent_3_id,true);
			end loop;
		end loop;
	
	end loop;
	
	END;
$function$
;
