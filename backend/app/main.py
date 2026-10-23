import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings
from backend.app.core.database import engine, Base
import backend.app.models # Discover all models
from backend.app.workers.scheduler import start_scheduler, stop_scheduler

from backend.app.api.auth import router as auth_router
from backend.app.api.institutions import router as institutions_router
from backend.app.api.complaints import router as complaints_router
from backend.app.api.cases import router as cases_router
from backend.app.api.transfers import router as transfers_router
from backend.app.api.overlaps import router as overlaps_router
from backend.app.api.notifications import router as notifications_router
from backend.app.api.reports import router as reports_router
from backend.app.api.audit import router as audit_router
from backend.app.api.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # Start scheduler
    start_scheduler()
    yield
    # Stop scheduler
    stop_scheduler()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Integrated Institution Complaint Monitoring and Coordination Platform (AICTE ICMS) — SIH PS-264",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under API prefix
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(institutions_router, prefix=settings.API_V1_STR)
app.include_router(complaints_router, prefix=settings.API_V1_STR)
app.include_router(cases_router, prefix=settings.API_V1_STR)
app.include_router(transfers_router, prefix=settings.API_V1_STR)
app.include_router(overlaps_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(audit_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AICTE ICMS Backend API",
        "version": "1.0.0",
        "tagline": settings.TAGLINE
    }

# Serve built frontend static files if dist directory exists (Deployable single-server mode)
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    from fastapi.responses import FileResponse

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "AICTE ICMS Backend API active. Build frontend to view interface."}
