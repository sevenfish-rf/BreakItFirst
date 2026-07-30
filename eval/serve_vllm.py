import modal

# Official pre-built vLLM image with Python 3.10 specified for Modal
image = modal.Image.from_registry("vllm/vllm-openai:v0.6.3.post1", add_python="3.10")

app = modal.App("bif-vllm-openai")

# High-performance NVIDIA GLM 5.2 NVFP4 model
MODEL_NAME = "nvidia/GLM-5.2-NVFP4"

@app.function(
    image=image,
    gpu="H100",                 # Requires H100 GPU for NVFP4 hardware acceleration
    timeout=600,
    scaledown_window=120,       # Auto-stop GPU container after 2 minutes idle
)
@modal.asgi_app()
def serve():
    import subprocess
    import time
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    import httpx
    from starlette.responses import StreamingResponse

    # Start vLLM OpenAI-compatible API server on internal port 8000
    cmd = [
        "python3", "-m", "vllm.entrypoints.openai.api_server",
        "--model", MODEL_NAME,
        "--port", "8000",
        "--max-model-len", "8192",
        "--trust-remote-code"
    ]
    
    subprocess.Popen(cmd)
    time.sleep(18)  # Wait for vLLM server to load weights into GPU

    web_app = FastAPI()
    web_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    client = httpx.AsyncClient(base_url="http://localhost:8000")

    @web_app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
    async def proxy(path: str, request: httpx.Request):
        req = client.build_request(
            request.method,
            path,
            headers=request.headers.raw,
            content=await request.body()
        )
        r = await client.send(req, stream=True)
        return StreamingResponse(r.aiter_raw(), status_code=r.status_code, headers=r.headers)

    return web_app
