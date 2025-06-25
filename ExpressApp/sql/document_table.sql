create table if not exists document_table
(
    "Document_UUID"   uuid not null
        constraint "Document_Table_pk"
            primary key,
    "Document_Base64" text not null
);