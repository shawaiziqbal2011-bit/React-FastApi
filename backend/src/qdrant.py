from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import WebBaseLoader

from langchain_qdrant import QdrantVectorStore

from qdrant_client import QdrantClient, models
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from decouple import config

qdrant_api_key = config("QDRANT_API_KEY")
qdrant_url = config("QDRANT_URL")
collection_name = "Websites"

client = QdrantClient(
    url=qdrant_url,
    api_key=qdrant_api_key
)

vector_store = QdrantVectorStore(
    client=client,
    collection_name=collection_name,
    embedding=GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-001",
        google_api_key=config("GOOGLE_API_KEY"),
        output_dimensionality=1536
    )
)

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000, 
    chunk_overlap=20, 
    length_function=len
)

def create_collection(collection_name):
    client.create_collection(
        collection_name=collection_name,
        vectors_config=models.VectorParams(
            size=1536,
            distance=models.Distance.COSINE
        )
    )
    print(f"Collection {collection_name} created successfully")


def upload_website_to_collection(url: str):

    if not client.collection_exists(
        collection_name=collection_name
    ):
        create_collection(collection_name)

    loader = WebBaseLoader(url)
    docs = loader.load_and_split(text_splitter)

    for doc in docs:
        doc.metadata = {
            "source_url": url
        }

    vector_store.add_documents(docs)

    return f"Successfully uploaded {len(docs)} documents to collection {collection_name} from {url}"


def qdrant_search(query: str):

    vector_search = vector_store.embeddings.embed_query(query)

    docs = client.search(
        collection_name=collection_name,
        query_vector=vector_search,
        limit=4
    )

    return docs


upload_website_to_collection(
    "https://hamel.dev/blog/posts/evals/"
)