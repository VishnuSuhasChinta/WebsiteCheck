"use client";

import { useState, useEffect } from "react";

interface ScanResult {
    name: string;
    url: string;
    status: "UP" | "DOWN";
    statusCode: number | null;
    responseTime: number | null;
}

const STORAGE_KEY = "scan_results";
const STORAGE_TIME_KEY = "scan_time";

export default function Dashboard() {
    const [results, setResults] = useState<ScanResult[]>([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanTime, setScanTime] = useState<string | null>(null);
    const [hasScanned, setHasScanned] = useState(false);

    // Restore cached results from sessionStorage on mount
    useEffect(() => {
        try {
            const cached = sessionStorage.getItem(STORAGE_KEY);
            const cachedTime = sessionStorage.getItem(STORAGE_TIME_KEY);
            if (cached) {
                setResults(JSON.parse(cached));
                setScanTime(cachedTime);
                setHasScanned(true);
            }
        } catch {
            // sessionStorage not available or corrupted, ignore
        }
    }, []);

    const runScan = async () => {
        setScanning(true);
        setError(null);
        setResults([]);
        setScanTime(null);

        try {
            const res = await fetch("/api/scan");
            if (!res.ok) throw new Error(`Scan failed with status ${res.status}`);
            const data: ScanResult[] = await res.json();
            const timestamp = new Date().toLocaleString();
            setResults(data);
            setScanTime(timestamp);
            setHasScanned(true);

            // Cache to sessionStorage
            try {
                sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
                sessionStorage.setItem(STORAGE_TIME_KEY, timestamp);
            } catch {
                // storage full or unavailable, ignore
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Scan failed. Please try again.");
        } finally {
            setScanning(false);
        }
    };

    const upCount = results.filter((r) => r.status === "UP").length;
    const downCount = results.filter((r) => r.status === "DOWN").length;
    const avgTime =
        results.length > 0
            ? Math.round(
                results
                    .filter((r) => r.responseTime !== null)
                    .reduce((sum, r) => sum + (r.responseTime ?? 0), 0) /
                (results.filter((r) => r.responseTime !== null).length || 1)
            )
            : 0;

    return (
        <div className="container">
            {/* Header */}
            <header className="header">
                <div className="header-inner">
                    <div className="header-title-group">
                        <span className="header-badge">
                            <span className="header-badge-dot"></span>
                            Diagnostic Tool
                        </span>
                        <h1>Website Integrity Scanner</h1>
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

            {/* Stats Bar */}
            {hasScanned && !scanning && (
                <div className="stats-bar">
                    <div className="stat-card">
                        <div className="stat-label">Total Sites</div>
                        <div className="stat-value">{results.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Online</div>
                        <div className="stat-value up">{upCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Offline</div>
                        <div className="stat-value down">{downCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Avg. Response</div>
                        <div className="stat-value">{avgTime}ms</div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && <div className="error-state">{error}</div>}

            {/* Scanning State */}
            {scanning && (
                <div className="scanning-overlay">
                    <div className="scanning-spinner"></div>
                    <div className="scanning-text">
                        Scanning all configured sites… This may take a few seconds.
                    </div>
                </div>
            )}

            {/* Empty State */}
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
                    <p>Click "Run Scan" to check website availability.</p>
                </div>
            )}

            {/* Results Table */}
            {hasScanned && !scanning && results.length > 0 && (
                <>
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
                                {results.map((result, i) => (
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

            {/* Footer */}
            <footer className="footer">
                Website Integrity Scanner · MVP v1.0 · Stateless Diagnostic Tool
            </footer>
        </div>
    );
}
