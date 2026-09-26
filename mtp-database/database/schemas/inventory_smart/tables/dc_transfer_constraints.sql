--liquibase formatted sql
--changeset akash.bhandari@impactanalytics.co:dc_transfer_constraints stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-67597
--comment: initial changeset for dc_transfer_constraints

CREATE TABLE IF NOT EXISTS inventory_smart.dc_transfer_constraints (
    hierarchy JSONB NULL,
    source_dc VARCHAR NULL,
    destination_dc VARCHAR NULL,
    min_transfer_quantity VARCHAR NULL,
    created_by int4 NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_by int4 NULL,
    updated_at timestamptz NULL
 );

--changeset akash.bhandari@impactanalytics.co:add_id_column stripComments:false splitStatements:false context:VS_inv_smart labels:MTP-67597
--comment: Add the ID column if it does not already exist
ALTER TABLE inventory_smart.dc_transfer_constraints ADD COLUMN IF NOT EXISTS id BIGSERIAL PRIMARY KEY;



--changeset kamuju.mahaveer:dc_transfer_constraints_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema for dc_transfer_constraints
ALTER TABLE inventory_smart.dc_transfer_constraints ALTER COLUMN source_dc TYPE int4 USING source_dc::int4;
ALTER TABLE inventory_smart.dc_transfer_constraints ALTER COLUMN destination_dc TYPE int4 USING destination_dc::int4;
ALTER TABLE inventory_smart.dc_transfer_constraints ADD CONSTRAINT dc_transfer_constraints_unique UNIQUE (hierarchy, source_dc, destination_dc);
ALTER TABLE inventory_smart.dc_transfer_constraints ADD CONSTRAINT dc_transfer_constraints_source_dc FOREIGN KEY (source_dc) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_transfer_constraints ADD CONSTRAINT dc_transfer_constraints_destination_dc FOREIGN KEY (destination_dc) REFERENCES global.distribution_centres(dc_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.dc_transfer_constraints ALTER COLUMN created_at DROP NOT NULL;
ALTER TABLE inventory_smart.dc_transfer_constraints ALTER COLUMN created_by DROP NOT NULL;


--changeset shashwat.yadav:dc_transfer_constraints_v1 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Added index for dc_transfer_constraints
CREATE INDEX IF NOT EXISTS dc_transfer_constraints_product_code_gin_idx on inventory_smart.dc_transfer_constraints using gin(hierarchy);

--changeset anujkumar.singh:dc_transfer_constraints_v2 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated data_type for dc_transfer_constraints
ALTER TABLE inventory_smart.dc_transfer_constraints ALTER COLUMN min_transfer_quantity TYPE INTEGER USING min_transfer_quantity::INTEGER;

--changeset linu.nazil:dc_transfer_constraints_v3 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated data type for dc_transfer_constraints
ALTER TABLE inventory_smart.dc_transfer_constraints ALTER COLUMN min_transfer_quantity TYPE INT8 USING min_transfer_quantity::INT8;

--changeset anujkumar.singhl:dc_transfer_constraints_v4 stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Updated schema and cosntraints
ALTER TABLE inventory_smart.dc_transfer_constraints ADD COLUMN IF NOT EXISTS product_code VARCHAR(50);
ALTER TABLE inventory_smart.dc_transfer_constraints DROP CONSTRAINT IF EXISTS dc_transfer_constraints_unique;
ALTER TABLE inventory_smart.dc_transfer_constraints ADD CONSTRAINT dc_transfer_constraints_unique UNIQUE (product_code, source_dc, destination_dc);

--changeset shashwat.yadav:idx_dc_transfer_constraints_hierarchy_source_dest stripComments:false splitStatements:false context:Release_1_0 labels:VS-629
--comment: Added index for dc_transfer_constraints
CREATE INDEX IF NOT EXISTS idx_dc_transfer_constraints_hierarchy_source_dest ON inventory_smart.dc_transfer_constraints ((hierarchy->>'product_code'), source_dc, destination_dc);