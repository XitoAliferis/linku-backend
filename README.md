# linku-backend

# To run the Letta server locally 
Recursively clone Letta 
```
git clone --recursive https://github.com/letta-ai/letta.git
```

Build the docker if you havent
```
cd letta
docker build .
```

Setup your enviorment keys 
```
LETTA_PG_URI=postgresql://postgres.id:password@aws-0-us-west-1.pooler.supabase.com:####/postgres
LETTA_PG_DB=postgres
LETTA_PG_PORT=####
ANTHROPIC_API_KEY=sk-ant-
OPENAI_API_KEY=sk-proj-
```

Run the docker after setting
```
docker run --env-file .env -p 8283:8283 letta/letta:latest
```