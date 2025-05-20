create table if not exists selection_table
(
    "Settings"         json,
    "Page_Words"       json,
    "Selection_bounds" json,
    "isCompleted"      boolean default false,
    "Selection_UUID"   uuid not null
        constraint selection_table_pk
            primary key,
    "Document_UUID"    uuid
        constraint "selection_table_document_table_Document_UUID_fk"
            references document_table
);