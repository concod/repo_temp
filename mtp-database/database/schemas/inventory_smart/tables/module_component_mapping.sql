--liquibase formatted sql
--changeset liquibase:module_component_mapping stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for module_component_mapping
CREATE TABLE IF NOT EXISTS inventory_smart.module_component_mapping (
    mapping_id SERIAL PRIMARY KEY,
    module_id INT,
    component_id INT NOT NULL,
    module_name TEXT,
    component_name TEXT,
    level VARCHAR(50),
    description TEXT,
    UNIQUE (module_id, component_id)
);

--changeset liquibase:module_component_mapping_v2_add_table_name stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-120981:add table_name column to module_component_mapping
ALTER TABLE inventory_smart.module_component_mapping ADD COLUMN IF NOT EXISTS table_name VARCHAR(128);

--changeset adesh:module_component_mapping_add_level_agg stripComments:false splitStatements:false context:MTP-122243 labels:MTP-122243
--comment: MTP-122243: Add level_agg column to module_component_mapping
ALTER TABLE inventory_smart.module_component_mapping ADD COLUMN IF NOT EXISTS level_agg VARCHAR(50) NULL;

--changeset rajan:adding_display_order_to_control_the_result_order stripComments:false splitStatements:false context:MTP-125187 labels:MTP-125187
--comment: MTP-125187: Adding display_order to control the result order
ALTER TABLE inventory_smart.module_component_mapping ADD COLUMN IF NOT EXISTS display_order INT;

--changeset liquibase:module_component_mapping_table_name_level_agg_default_not_null stripComments:false splitStatements:true context:MTP-130441 labels:MTP-130441
--comment: MTP-130441 Add NOT NULL constraint to table_name and level_agg columns
ALTER TABLE inventory_smart.module_component_mapping ALTER COLUMN table_name SET NOT NULL;
ALTER TABLE inventory_smart.module_component_mapping ALTER COLUMN level_agg SET NOT NULL;

--changeset liquibase:module_component_mapping_table_name_source_db stripComments:false splitStatements:true context:MTP-130441 labels:MTP-130441
--comment: Adding source db column for bq kpi
ALTER TABLE inventory_smart.module_component_mapping ADD COLUMN IF NOT EXISTS source_db VARCHAR NULL;
