--liquibase formatted sql
--changeset liquibase:product_unit_definitions stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_unit_definitions
CREATE TABLE global.product_unit_definitions (
    pud_code serial4 NOT NULL,
    name varchar NOT NULL,
    description text,
    definition_type varchar NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    created_by integer,
    updated_by integer,
    pack_quantity integer,
    packs_in_carton_quantity integer,
    cartons_in_box_quantity integer,
    metric_type varchar NOT NULL,
    source_pud_code varchar NULL,
    CONSTRAINT product_unit_definitions_un UNIQUE (source_pud_code),
    CONSTRAINT pud_metric_type_check CHECK (((metric_type)::text = ANY (ARRAY[('single size - all colors'::varchar)::text, ('all size - single color'::varchar)::text, ('different size - different color'::varchar)::text]))),
    CONSTRAINT pud_name_check CHECK ((length((name)::text) > 0)),
    CONSTRAINT pud_type_check CHECK (((definition_type)::text = ANY (ARRAY[('eaches'::varchar)::text, ('packs'::varchar)::text, ('cartons'::varchar)::text, ('boxes'::varchar)::text])))
);
ALTER TABLE global.product_unit_definitions
    ADD CONSTRAINT upud_pk PRIMARY KEY (pud_code);
ALTER TABLE global.product_unit_definitions
    ADD CONSTRAINT product_unit_definations_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.product_unit_definitions
    ADD CONSTRAINT product_unit_definations_updated_at_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
