from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage
from decouple import config


model = ChatGoogleGenerativeAI(
     model="gemini-3.8-flash",
    google_api_key=config("GOOGLE_API_KEY"),
    temperature=0,
)


async def stream_completion(question: str, docs: list):

    context = "\n\n".join(
        doc.get("page_content", "")
        for doc in docs
    )

    prompt = f"""
Answer the question based on the context below.
Answer concisely and use markdown where appropriate.

Context:
{context}

Question:
{question}

Answer:
"""

    async for chunk in model.astream(
        [HumanMessage(content=prompt)]
    ):
        if chunk.content:
            yield chunk.content