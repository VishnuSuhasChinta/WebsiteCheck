"use client";

import { useState, useEffect, useRef } from "react";

interface ScanResult {
    name: string;
    url: string;
    status: "UP" | "DOWN";
    statusCode: number | null;
    responseTime: number | null;
}

const STORAGE_KEY = "scan_results";
const STORAGE_TIME_KEY = "scan_time";
const AUTH_KEY = "wc_authenticated";
const CORRECT_PASSWORD = "admin123";

type View = "landing" | "auth" | "dashboard";

export default function App() {
    const [view, setView] = useState<View>("landing");
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState(false);
    const [authShake, setAuthShake] = useState(false);
    const passwordRef = useRef<HTMLInputElement>(null);

    // Dashboard state
    const [results, setResults] = useState<ScanResult[]>([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanTime, setScanTime] = useState<string | null>(null);
    const [hasScanned, setHasScanned] = useState(false);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Check auth + restore cache on mount
    useEffect(() => {
        try {
            if (sessionStorage.getItem(AUTH_KEY) === "true") {
                setView("dashboard");
            }
            const cached = sessionStorage.getItem(STORAGE_KEY);
            const cachedTime = sessionStorage.getItem(STORAGE_TIME_KEY);
            if (cached) {
                setResults(JSON.parse(cached));
                setScanTime(cachedTime);
                setHasScanned(true);
            }
        } catch {
            // ignore
        }
    }, []);

    // Focus password input when auth modal opens
    useEffect(() => {
        if (view === "auth") {
            setTimeout(() => passwordRef.current?.focus(), 100);
        }
    }, [view]);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === CORRECT_PASSWORD) {
            setAuthError(false);
            try {
                sessionStorage.setItem(AUTH_KEY, "true");
            } catch { /* ignore */ }
            setView("dashboard");
        } else {
            setAuthError(true);
            setAuthShake(true);
            setTimeout(() => setAuthShake(false), 500);
            setPassword("");
            passwordRef.current?.focus();
        }
    };

    const runScan = async () => {
        setScanning(true);
        setError(null);
        setResults([]);
        setScanTime(null);
        setCopied(false);

        try {
            const res = await fetch("/api/scan");
            if (!res.ok) throw new Error(`Scan failed with status ${res.status}`);
            const data: ScanResult[] = await res.json();
            const timestamp = new Date().toLocaleString();
            setResults(data);
            setScanTime(timestamp);
            setHasScanned(true);

            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                sessionStorage.setItem(STORAGE_TIME_KEY, timestamp);
            } catch { /* ignore */ }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
        } finally {
            setScanning(false);
        }
    };

    const upCount = results.filter((r) => r.status === "UP").length;
    const downCount = results.filter((r) => r.status === "DOWN").length;
    const downSites = results.filter((r) => r.status === "DOWN");
    const avgTime =
        results.length > 0
            ? Math.round(
                results
                    .filter((r) => r.responseTime !== null)
                    .reduce((sum, r) => sum + (r.responseTime ?? 0), 0) /
                (results.filter((r) => r.responseTime !== null).length || 1)
            )
            : 0;

    // Filter results based on search query (case-insensitive substring match)
    const filteredResults = results.filter((r) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase().trim();
        return (
            r.name.toLowerCase().includes(query) ||
            r.url.toLowerCase().includes(query)
        );
    });

    const copyBrokenLinks = async () => {
        const links = downSites.map((r) => r.url).join("\n");
        try {
            await navigator.clipboard.writeText(links);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            const ta = document.createElement("textarea");
            ta.value = links;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // ─── LANDING PAGE ───
    if (view === "landing") {
        return (
            <div className="landing">
                <div className="landing-content">
                    <div className="landing-eyebrow">Infrastructure Monitoring</div>
                    <h1 className="landing-title">Website Checker</h1>
                    <p className="landing-desc">
                        Instant diagnostics for your web infrastructure.
                        <br />
                        Identify broken pages before your users do.
                    </p>
                    <button
                        className="landing-cta"
                        onClick={() => setView("auth")}
                    >
                        Check Sites Now
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                        </svg>
                    </button>
                </div>
                <footer className="landing-footer">
                    Website Checker · Stateless Diagnostic Tool
                </footer>
            </div>
        );
    }

    // ─── AUTH MODAL ───
    if (view === "auth") {
        return (
            <div className="auth-backdrop">
                <div className={`auth-card ${authShake ? "auth-shake" : ""}`}>
                    <div className="auth-header">
                        <h2>Website Checker</h2>
                        <p>Enter the access password to continue.</p>
                    </div>
                    <form onSubmit={handleLogin} className="auth-form">
                        <div className="auth-field">
                            <label htmlFor="password-input">Password</label>
                            <input
                                ref={passwordRef}
                                id="password-input"
                                type="password"
                                className={`auth-input ${authError ? "auth-input-error" : ""}`}
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setAuthError(false);
                                }}
                                autoComplete="off"
                            />
                            {authError && (
                                <div className="auth-error-msg">Incorrect password. Try again.</div>
                            )}
                        </div>
                        <button type="submit" className="auth-submit">
                            Continue
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14" />
                                <path d="m12 5 7 7-7 7" />
                            </svg>
                        </button>
                    </form>
                    <button className="auth-back" onClick={() => { setView("landing"); setPassword(""); setAuthError(false); }}>
                        ← Back
                    </button>
                </div>
            </div>
        );
    }

    // ─── DASHBOARD ───
    return (
        <div className="container">
            <header className="header">
                <div className="header-inner">
                    <div className="header-title-group">
                        <h1>Website Checker</h1>
                        <p>One-click scan to check which pages are live and which are broken.</p>
                    </div>
                    <button
                        id="scan-button"
                        className="scan-btn"
                        onClick={runScan}
                        disabled={scanning}
                    >
                        <span className="scan-btn-icon">
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                {scanning ? (
                                    <circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10" />
                                ) : (
                                    <>
                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                        <polyline points="22 4 12 14.01 9 11.01" />
                                    </>
                                )}
                            </svg>
                        </span>
                        {scanning ? "Scanning…" : "Run Scan"}
                    </button>
                </div>
            </header>

            {/* Stats Section */}
            {hasScanned && !scanning && (
                <div className="stats-section">
                    <div className="hero-stats">
                        <div className="hero-card hero-up">
                            <div className="hero-card-header">
                                <span className="hero-dot up-dot"></span>
                                <span className="hero-label">Online</span>
                            </div>
                            <div className="hero-value up">{upCount}</div>
                            <div className="hero-sub">of {results.length} sites responding</div>
                        </div>
                        <div className="hero-card hero-down">
                            <div className="hero-card-header">
                                <span className="hero-dot down-dot"></span>
                                <span className="hero-label">Offline</span>
                                {downCount > 0 && (
                                    <button
                                        className="copy-btn"
                                        onClick={copyBrokenLinks}
                                        title="Copy broken URLs to clipboard"
                                    >
                                        {copied ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                            </svg>
                                        )}
                                        {copied ? "Copied!" : "Copy Links"}
                                    </button>
                                )}
                            </div>
                            <div className="hero-value down">{downCount}</div>
                            <div className="hero-sub">
                                {downCount === 0
                                    ? "All sites are healthy"
                                    : `${downCount} site${downCount > 1 ? "s" : ""} unreachable`}
                            </div>
                        </div>
                    </div>

                    <div className="secondary-stats">
                        <div className="stat-card-sm">
                            <div className="stat-label">Total Sites</div>
                            <div className="stat-value-sm">{results.length}</div>
                        </div>
                        <div className="stat-card-sm">
                            <div className="stat-label">Avg. Response</div>
                            <div className="stat-value-sm">{avgTime}ms</div>
                        </div>

                    </div>
                </div>
            )}

            {error && <div className="error-state">{error}</div>}

            {scanning && (
                <div className="scanning-overlay">
                    <div className="scanning-spinner"></div>
                    <div className="scanning-text">
                        Scanning all configured sites… This may take a few seconds.
                    </div>
                </div>
            )}

            {!hasScanned && !scanning && !error && (
                <div className="empty-state">
                    <div className="empty-state-icon">
                        <svg
                            width="28"
                            height="28"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 6v6l4 2" />
                        </svg>
                    </div>
                    <h2>No scan results yet</h2>
                    <p>Click &quot;Run Scan&quot; to check website availability.</p>
                </div>
            )}

            {hasScanned && !scanning && results.length > 0 && (
                <>
                    {/* Search Bar */}
                    <div className="search-bar-wrapper">
                        <div className="search-bar">
                            <div className="search-icon">
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                            </div>
                            <input
                                id="search-input"
                                type="text"
                                className="search-input"
                                placeholder="Search by site name or URL…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            {searchQuery && (
                                <button
                                    className="search-clear"
                                    onClick={() => setSearchQuery("")}
                                    title="Clear search"
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>
                        {searchQuery && (
                            <div className="search-results-count">
                                {filteredResults.length} of {results.length} site{results.length !== 1 ? "s" : ""}
                            </div>
                        )}
                    </div>
                    <div className="table-wrapper">
                        <table className="results-table" id="results-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>URL</th>
                                    <th>Status</th>
                                    <th>Response Time</th>
                                    <th className="hide-mobile">Status Code</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResults.map((result, i) => (
                                    <tr key={i}>
                                        <td>
                                            <span className="site-name">{result.name}</span>
                                        </td>
                                        <td>
                                            <span className="site-url">
                                                <a
                                                    href={result.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                >
                                                    {result.url}
                                                </a>
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={`status-badge ${result.status === "UP" ? "up" : "down"}`}
                                            >
                                                <span className="status-dot"></span>
                                                {result.status}
                                            </span>
                                        </td>
                                        <td>
                                            {result.responseTime !== null ? (
                                                <span className="response-time">{result.responseTime}ms</span>
                                            ) : (
                                                <span className="empty-cell">—</span>
                                            )}
                                        </td>
                                        <td className="hide-mobile">
                                            {result.statusCode !== null ? (
                                                <span
                                                    className={`status-code ${result.statusCode >= 200 && result.statusCode < 400
                                                        ? "success"
                                                        : "error"
                                                        }`}
                                                >
                                                    {result.statusCode}
                                                </span>
                                            ) : (
                                                <span className="empty-cell">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {scanTime && (
                        <div className="scan-timestamp">Last scanned: {scanTime}</div>
                    )}
                </>
            )}

            <footer className="footer">
                Website Checker · Stateless Diagnostic Tool
            </footer>
        </div>
    );
}
