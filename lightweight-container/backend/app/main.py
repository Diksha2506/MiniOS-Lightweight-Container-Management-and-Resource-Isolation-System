"""
FastAPI application entry point.
Start with: uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.containers import router as containers_router
from .routes.system import router as system_router

app = FastAPI(
    title="Lightweight Container Engine API",
    description="REST API that wraps the C container engine for the web dashboard.",
    version="2.0.0",
)

# Allow requests from the Vite dev server and the production build
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(system_router)
app.include_router(containers_router)
