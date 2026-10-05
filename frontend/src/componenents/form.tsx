"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import axios from "axios"
import ReactMarkdown from "react-markdown"
import type { Components } from "react-markdown"

const api = axios.create({ baseURL: "http://127.0.0.1:8000" })

interface RetrievedDocument {
    page_content: string
    metadata?: { source_url?: string }
}

interface ChatResponse {
    answer: string
    documents?: RetrievedDocument[]
}

const markdownComponents: Components = {
    p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline underline-offset-2">
            {children}
        </a>
    ),
    code: ({ children }) => <code className="rounded bg-stone-100 px-1.5 py-0.5 font-mono text-sm">{children}</code>,
}

function DocumentItem({ doc }: { doc: RetrievedDocument }) {
    const [isOpen, setIsOpen] = useState(false)
    const title = `${doc.page_content.split(" ").slice(0, 6).join(" ")}…`
    const source = doc.metadata?.source_url

    return (
        <li className="rounded-lg border border-stone-200 bg-white">
            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
                <span className="truncate">{title}</span>
                <span aria-hidden="true" className={`text-stone-500 transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
            </button>
            {isOpen && (
                <div className="space-y-3 border-t border-stone-200 px-4 py-3 text-sm text-stone-700">
                    <p className="whitespace-pre-line leading-relaxed">
                        {doc.page_content
                            .replace(/\n\s*\n+/g, "\n\n")
                            .trim()}
                    </p>
                    {source && <p className="break-all">Source: <a href={source} target="_blank" rel="noopener noreferrer" className="text-teal-700 underline underline-offset-2">{source}</a></p>}
                </div>
            )}
        </li>
    )
}

export default function QuestionForm() {
    const [question, setQuestion] = useState("")
    const [answer, setAnswer] = useState("")
    const [documents, setDocuments] = useState<RetrievedDocument[]>([])
    const [notice, setNotice] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const resetResults = () => {
        setAnswer("")
        setDocuments([])
        setNotice("")
        setError("")
    }

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!question.trim()) return
        resetResults()
        setIsLoading(true)
        try {
            const { data } = await api.post<ChatResponse>("/chat", { message: question })
            setAnswer(data.answer)
            setDocuments(data.documents ?? [])
        } catch {
            setError("Couldn’t get an answer. Check that the backend is running on localhost:8000 and try again.")
        } finally {
            setIsLoading(false)
        }
    }

    const handleIndexing = async () => {
        if (!question.trim()) return

        resetResults()
        setIsLoading(true)

        try {
            const { data } = await api.post<{ response: string }>(
                `/indexing?url=${encodeURIComponent(question.trim())}`
            )

            setNotice(data?.response || "Website indexed successfully.")
        } catch {
            setError("Indexing failed. Check the backend logs and try again.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <main className="min-h-screen bg-stone-50 px-4 py-12 text-stone-900">
            <div className="mx-auto w-full max-w-3xl">
                <header className="mb-8">
                    <h1 className="text-2xl font-semibold tracking-tight">Ask your documents</h1>
                    <p className="mt-1 text-sm text-stone-600">Type a question and get an answer along with the passages it came from.</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-3">
                    <label htmlFor="question" className="block text-sm font-medium text-stone-800">Question</label>
                    <input id="question" type="text" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="e.g. What does the refund policy say?" className="w-full rounded-lg border border-stone-300 bg-white px-4 py-3 text-base shadow-sm outline-none transition placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20" />
                    <div className="flex flex-wrap gap-3">
                        <button type="submit" disabled={isLoading || !question.trim()} className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">Ask</button>
                        <button type="button" onClick={handleIndexing} disabled={isLoading || !question.trim()} className="rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50">Index</button>
                    </div>
                </form>

                <section aria-live="polite" className="mt-8">
                    {isLoading && <div className="flex justify-center py-10"><div role="status" aria-label="Loading" className="h-9 w-9 animate-spin rounded-full border-4 border-stone-200 border-t-teal-700" /></div>}
                    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
                    {notice && <p className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{notice}</p>}
                    {answer && <div className="space-y-8">
                        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm"><h2 className="mb-3 text-lg font-semibold">Answer</h2><div className="text-stone-800"><ReactMarkdown components={markdownComponents}>{answer}</ReactMarkdown></div></div>
                        {documents.length > 0 && <div><h2 className="mb-3 text-lg font-semibold">Documents</h2><ul className="space-y-2">{documents.map((doc, index) => <DocumentItem key={`${doc.page_content}-${index}`} doc={doc} />)}</ul></div>}
                    </div>}
                </section>
            </div>
        </main>
    )
}
