from langchain_core.prompts.chat import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough, RunnableParallel
from langchain_google_genai import ChatGoogleGenerativeAI
from operator import itemgetter

from decouple import config

from .qdrant import vector_store, qdrant_search
from .gemini_utils import stream_completion


# Gemini model
model = ChatGoogleGenerativeAI(
    model="gemini-3.5-flash-lite",
    google_api_key=config("GOOGLE_API_KEY"),
    temperature=0,
)


prompt_template = """
You are a document-based question answering assistant.

Answer the question ONLY using the provided context.

Rules:
- Use only the information available in the context.
- Do not use your own general knowledge.
- Do not make assumptions.
- Do not invent or guess information.
- If the answer is not available in the context, say:
  "I don't have enough information in the provided documents."
- Keep the answer concise.
- Use markdown and bullet points where appropriate.

Context:
{context}

Question:
{question}

Answer:
"""
prompt = ChatPromptTemplate.from_template(prompt_template)

retriever = vector_store.as_retriever()


def create_chain():
    chain = (
        {
            "context": retriever.with_config(top_k=4),
            "question": RunnablePassthrough(),
        }
        | RunnableParallel({
            "response": prompt | model,
            "context": itemgetter("context"),
        })
    )

    return chain


def get_answer_and_docs(question: str):
    chain = create_chain()

    response = chain.invoke(question)

    answer = response["response"].content

    if isinstance(answer, list):
        answer = "\n".join(
            item.get("text", "")
            for item in answer
            if isinstance(item, dict)
        )

    context = response["context"]

    return {
        "answer": answer,
        "context": context
    }


async def async_get_answer_and_docs(question: str):

    # Search relevant documents from Qdrant
    docs = qdrant_search(query=question)

    # Convert Qdrant documents into dictionaries
    docs_dict = [doc.payload for doc in docs]

    # Send retrieved documents to frontend
    yield {
        "event_type": "on_retriever_end",
        "content": docs_dict
    }

    # Stream Gemini response
    async for chunk in stream_completion(question, docs_dict):
        yield {
            "event_type": "on_chat_model_stream",
            "content": chunk
        }

    # Finished
    yield {
        "event_type": "done"
    }
