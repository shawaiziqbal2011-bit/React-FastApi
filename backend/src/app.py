from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.rag import get_answer_and_docs
from src.qdrant import upload_website_to_collection

app = FastAPI(
    title="My first RAG application",
    description="This is a simple RAG application built with FastAPI",
    version="1.0.0"
)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Message(BaseModel):
    message: str


@app.post("/chat")
def chat(message: Message):

    response = get_answer_and_docs(message.message)

    response_content = {
        "question": message.message,
        "answer": response["answer"],
        "documents": [doc.dict() for doc in response["context"]]
    }

    return JSONResponse(
        content=response_content,
        status_code=200
    )


@app.post(
    "/indexing",
    description="This endpoint is used to index a website into the Qdrant collection"
)
def index_website(url: str):

    try:
        response = upload_website_to_collection(url)

        return JSONResponse(
            content={"response": response},
            status_code=200
        )

    except Exception as e:

        return JSONResponse(
            content={"error": str(e)},
            status_code=500
        )