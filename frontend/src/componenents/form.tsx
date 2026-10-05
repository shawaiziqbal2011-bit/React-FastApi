import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const api = axios.create({
    baseURL: "http://localhost:8000",
});

const Expander: React.FC<any> = ({ title, content, source }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-gray-200 py-3">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left text-sm font-medium text-gray-700 hover:text-black"
            >
                {isOpen ? "− " : "+ "}
                {title}
            </button>

            {isOpen && (
                <div className="mt-3 pl-5 text-sm text-gray-600">
                    <p className="leading-6">{content}</p>

                    {source && (
                        <p className="mt-3">
                            Source:{" "}
                            <a
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                {source}
                            </a>
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

function QuestionForm() {
    const [question, setQuestion] = useState("");
    const [answer, setAnswer] = useState("");
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // const handleSubmit = (e: any) => {
    //     e.preventDefault();

    //     setAnswer("");
    //     setDocuments([]);
    //     setIsLoading(true);

    //     const websocket = new WebSocket(
    //         "wss://johannesjolkkonen--rag-backend-endpoint.modal.run/async_chat"
    //     );

    //     websocket.onopen = () => {
    //         websocket.send(question);
    //     };

    //     websocket.onmessage = (event) => {
    //         const data = JSON.parse(event.data);

    //         if (data.event_type === "on_retriever_end") {
    //             setDocuments(data.content);
    //         }

    //         if (data.event_type === "on_chat_model_stream") {
    //             setAnswer((prev) => prev + data.content);
    //         }
    //     };

    //     websocket.onclose = () => {
    //         setIsLoading(false);
    //     };

    //     websocket.onerror = () => {
    //         setIsLoading(false);
    //     };
    // };

    const handleSubmit = async (
        e: React.FormEvent<HTMLButtonElement>
    ) => {
        e.preventDefault();

        setAnswer("");
        setDocuments([]);
        setIsLoading(true);

        try {
            const response: any = await api.post("/chat", {
                message: question,
            });

            console.log("actual response:", response.data);

            setAnswer(response.data.answer[0].text);
            setDocuments(response.data.documents);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleIndexing = async (
        e: React.FormEvent<HTMLButtonElement>
    ) => {
        e.preventDefault();

        setAnswer("");
        setIsLoading(true);

        try {
            const response = await api.post("/indexing", {
                message: question,
            });

            setAnswer(response?.data?.response);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-12">
            <div className="mx-auto max-w-3xl">

                <div className="mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        RAG Assistant
                    </h1>

                    <p className="mt-1 text-sm text-gray-500">
                        Ask questions from your indexed documents.
                    </p>
                </div>

                <form className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask a question..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-500"
                    />

                    <div className="mt-3 flex gap-2">
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={isLoading || !question.trim()}
                            className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Ask
                        </button>

                        <button
                            type="submit"
                            onClick={handleIndexing}
                            disabled={isLoading || !question.trim()}
                            className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Index
                        </button>
                    </div>
                </form>

                {isLoading && (
                    <div className="flex min-h-[180px] items-center justify-center">
                        <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
                    </div>
                )}

                {!isLoading && answer && (
                    <div className="mt-8">

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-sm font-semibold text-gray-900">
                                Answer
                            </h2>

                            <div className="prose prose-sm max-w-none text-gray-700">
                                <ReactMarkdown>
                                    {answer}
                                </ReactMarkdown>
                            </div>
                        </div>

                        {documents.length > 0 && (
                            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                                <h2 className="mb-2 text-sm font-semibold text-gray-900">
                                    Documents
                                </h2>

                                <div>
                                    {documents.map(
                                        (document: any, index: number) => (
                                            <Expander
                                                key={index}
                                                title={
                                                    document.page_content
                                                        .split(" ")
                                                        .slice(0, 8)
                                                        .join(" ") + "..."
                                                }
                                                content={
                                                    document.page_content
                                                }
                                                source={
                                                    document.metadata
                                                        ?.source_url
                                                }
                                            />
                                        )
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default QuestionForm;