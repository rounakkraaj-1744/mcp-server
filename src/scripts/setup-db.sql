-- scripts/setup-db.sql
-- Run in Supabase Dashboard > SQL Editor

create extension if not exists vector;

create table if not exists schema_chunks (
  id          text primary key,
  content     text        not null,
  embedding   vector(384) not null,
  table_name  text,
  column_name text,
  kind        text           -- "table" or "column"
);

create index if not exists idx_schema_chunks_embedding
  on schema_chunks using hnsw (embedding vector_cosine_ops);

create or replace function match_schema_chunks(
  query_embedding vector(384),
  match_count     int default 5
)
returns table(id text, content text, table_name text,
              column_name text, kind text, similarity float)
language sql stable as $$
  select id, content, table_name, column_name, kind,
         1 - (embedding <=> query_embedding) as similarity
  from schema_chunks
  order by embedding <=> query_embedding
  limit match_count;
$$;